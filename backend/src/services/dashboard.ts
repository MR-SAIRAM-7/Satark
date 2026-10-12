/** Aggregates for the police dashboard. Localities only, never exact locations. */
import { formatInr, SCAM_TYPES, type ScamType } from '@satark/shared';

import { Alert, Check, Complaint, Ioc, Report, User } from '../db/models';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const HELD_STAGES = ['bank_hold', 'zero_fir', 'io_assigned'];

async function sumAmount(match: object): Promise<number> {
  const [row] = await Complaint.aggregate<{ total: number }>([
    { $match: { ...match, 'transaction.amount': { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$transaction.amount' } } },
  ]);
  return row?.total ?? 0;
}

export async function summary() {
  const day = hoursAgo(24);
  const [checks, scams, reports, confirmedIocs, openCases, goldenHour, unacked, protectedElders, atRisk, held] = await Promise.all([
    Check.countDocuments({ createdAt: { $gte: day } }),
    Check.countDocuments({ createdAt: { $gte: day }, verdict: 'scam' }),
    Report.countDocuments({ createdAt: { $gte: day } }),
    Ioc.countDocuments({ status: 'confirmed' }),
    Complaint.countDocuments({ stage: { $ne: 'io_assigned' } }),
    Complaint.countDocuments({ priority: 'golden_hour', goldenHourEndsAt: { $gt: new Date() } }),
    Alert.countDocuments({ severity: 'critical', ackedAt: null }),
    User.countDocuments({ role: 'elder' }),
    sumAmount({ stage: { $nin: HELD_STAGES } }),
    sumAmount({ stage: { $in: HELD_STAGES } }),
  ]);
  return { checks, scams, reports, confirmedIocs, openCases, goldenHour, unacked, protectedElders, amountAtRisk: atRisk, amountHeld: held };
}

export async function mapPoints(hours = 168) {
  const rows = await Report.aggregate<{ _id: { locality: string; type: string }; n: number; lat: number; lng: number }>([
    { $match: { createdAt: { $gte: hoursAgo(hours) } } },
    { $group: { _id: { locality: '$locality', type: '$scamType' }, n: { $sum: 1 }, lat: { $first: '$geo.lat' }, lng: { $first: '$geo.lng' } } },
  ]);
  const byLocality = new Map<string, { locality: string; lat: number; lng: number; count: number; byType: Record<string, number> }>();
  for (const r of rows) {
    const point = byLocality.get(r._id.locality) ?? { locality: r._id.locality, lat: r.lat, lng: r.lng, count: 0, byType: {} };
    point.count += r.n;
    point.byType[r._id.type] = (point.byType[r._id.type] ?? 0) + r.n;
    byLocality.set(r._id.locality, point);
  }
  return [...byLocality.values()]
    .map((p) => ({ ...p, topType: Object.entries(p.byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown' }))
    .sort((a, b) => b.count - a.count);
}

export async function trends(hours = 48) {
  const rows = await Report.aggregate<{ _id: { h: Date; t: string }; n: number }>([
    { $match: { createdAt: { $gte: hoursAgo(hours) } } },
    { $group: { _id: { h: { $dateTrunc: { date: '$createdAt', unit: 'hour', binSize: hours > 72 ? 6 : 2 } }, t: '$scamType' }, n: { $sum: 1 } } },
    { $sort: { '_id.h': 1 } },
  ]);
  const buckets = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const key = r._id.h.getTime();
    buckets.set(key, { ...(buckets.get(key) ?? {}), [r._id.t]: r.n });
  }
  const types = [...new Set(rows.map((r) => r._id.t))];
  return { types, points: [...buckets].map(([at, counts]) => ({ at, ...counts })) };
}

export const topIndicators = (type?: 'phone' | 'upi' | 'domain', limit = 15) =>
  Ioc.find(type ? { type } : {})
    .sort({ reportCount: -1, lastSeen: -1 })
    .limit(limit)
    .select('type masked reportCount status scamType firstSeen lastSeen campaign');

/** F23 "scam weather": what is rising in the last day, in plain words, in three languages. */
export async function scamWeather() {
  const count = (from: number, to: number) =>
    Report.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: hoursAgo(from), $lt: hoursAgo(to) } } },
      { $group: { _id: '$scamType', n: { $sum: 1 } } },
    ]);
  const [today, yesterday] = await Promise.all([count(24, 0), count(48, 24)]);
  const before = new Map(yesterday.map((r) => [r._id, r.n]));
  const rising = today
    .map((r) => ({ type: r._id as ScamType, today: r.n, change: r.n - (before.get(r._id) ?? 0) }))
    .sort((a, b) => b.today - a.today)
    .slice(0, 3);
  const [top] = rising;
  const held = await sumAmount({ stage: { $in: HELD_STAGES } });
  const label = (lang: 'en' | 'te' | 'hi') => (top ? SCAM_TYPES[top.type].label[lang] : '');
  return {
    rising,
    text: top
      ? {
          en: `Scam weather: "${label('en')}" is the most reported scam today (${top.today} reports). Real officials never ask for money or OTPs on a call. ${formatInr(held)} is on hold for victims who reported quickly.`,
          te: `స్కామ్ వాతావరణం: ఈరోజు ఎక్కువగా వచ్చిన మోసం "${label('te')}" (${top.today} రిపోర్టులు). నిజమైన అధికారులు ఫోన్‌లో డబ్బు లేదా OTP అడగరు.`,
          hi: `स्कैम मौसम: आज सबसे ज़्यादा रिपोर्ट हुई ठगी "${label('hi')}" है (${top.today} रिपोर्ट)। असली अधिकारी कॉल पर कभी पैसे या OTP नहीं माँगते।`,
        }
      : { en: 'Scam weather: quiet today.', te: 'స్కామ్ వాతావరణం: ఈరోజు ప్రశాంతంగా ఉంది.', hi: 'स्कैम मौसम: आज शांति है।' },
  };
}
