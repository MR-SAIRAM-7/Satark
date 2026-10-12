/**
 * Layer 5 - community threat intelligence ("herd immunity for scams").
 * A confirmed report adds hashed indicators; three independent reporters mark
 * one confirmed; phones pull new hashes through /iocs/sync so call screening
 * and message checks work offline.
 */
import { maskIndicator, type Indicator, type IndicatorType, type ScamType } from '@satark/shared';

import { Check, Ioc, oid, Report } from '../db/models';
import { indicatorHash } from '../lib/crypto';
import { locate } from '../lib/geo';
import { publish } from './realtime';

/** Same scores the phone uses for a cache hit. */
export const COMMUNITY_SCORE = { confirmed: 95, suspected: 60 } as const;
export const CONFIRM_AT = 3;

export interface CommunityHit {
  type: IndicatorType;
  masked: string;
  status: 'suspected' | 'confirmed';
  reportCount: number;
  scamType: string;
}

export async function lookupIndicators(indicators: Indicator[]): Promise<{ score: number; hits: CommunityHit[] }> {
  if (indicators.length === 0) return { score: 0, hits: [] };
  const docs = await Ioc.find({ hash: { $in: indicators.map(indicatorHash) } }).lean();
  const hits = docs.map((d) => ({ type: d.type, masked: d.masked, status: d.status, reportCount: d.reportCount, scamType: d.scamType }));
  return { score: hits.reduce((max, h) => Math.max(max, COMMUNITY_SCORE[h.status]), 0), hits };
}

export interface ReportedIndicator {
  type: IndicatorType;
  hash: string;
  masked: string;
  /** Raw value, only when the server itself saw it. */
  value?: string;
}

/** Hash + mask an indicator the server saw in full (WhatsApp forwards, seed data). */
export const toReported = (indicator: Indicator): ReportedIndicator => ({
  type: indicator.type,
  hash: indicatorHash(indicator),
  masked: maskIndicator(indicator),
  value: indicator.type === 'phone' ? undefined : indicator.value,
});

export interface ReportInput {
  /** Who is reporting: a user id, or a fingerprint for anonymous installs. */
  reporter: string;
  userId?: string;
  indicators: ReportedIndicator[];
  scamType: ScamType;
  locality?: string;
  clientCheckId?: string;
  channel?: 'app' | 'whatsapp' | 'call' | 'listener' | 'simulator' | 'seed';
  maskedText?: string;
  at?: Date;
}

async function upsertIndicator(input: ReportedIndicator, reporter: string, scamType: ScamType, at: Date) {
  const filter = { type: input.type, hash: input.hash };
  try {
    // Counts once per reporter: the filter excludes indicators this reporter already reported.
    await Ioc.updateOne(
      { ...filter, reporters: { $ne: reporter } },
      {
        $addToSet: { reporters: reporter },
        $inc: { reportCount: 1 },
        $set: { lastSeen: at },
        $setOnInsert: { masked: input.masked, firstSeen: at, scamType, ...(input.value ? { value: input.value } : {}) },
      },
      { upsert: true },
    );
  } catch (err) {
    // Duplicate key: this reporter already reported it. Just refresh lastSeen.
    if ((err as { code?: number }).code !== 11000) throw err;
    await Ioc.updateOne(filter, { $set: { lastSeen: at } });
  }
  const doc = (await Ioc.findOne(filter))!;
  let confirmedNow = false;
  if (doc.status === 'suspected' && doc.reportCount >= CONFIRM_AT) {
    doc.status = 'confirmed';
    confirmedNow = true;
  }
  if (doc.scamType === 'unknown' && scamType !== 'unknown') doc.scamType = scamType;
  await doc.save();
  return { doc, confirmedNow };
}

export async function reportIndicators(input: ReportInput) {
  const at = input.at ?? new Date();
  const results = await Promise.all(input.indicators.map((i) => upsertIndicator(i, input.reporter, input.scamType, at)));
  const place = locate(input.locality);
  const check = input.clientCheckId ? await Check.findOne({ clientId: input.clientCheckId }).sort({ createdAt: -1 }) : null;

  const report = await Report.create({
    user: input.userId ? oid(input.userId) : undefined,
    check: check?._id,
    clientCheckId: input.clientCheckId,
    scamType: input.scamType,
    locality: place.locality,
    geo: { lat: place.lat, lng: place.lng },
    iocs: results.map((r) => r.doc._id),
    channel: input.channel ?? 'app',
    maskedText: input.maskedText ?? check?.maskedText,
    createdAt: at,
  });

  if (input.channel !== 'seed') {
    await publish({
      type: 'report',
      severity: 'warning',
      title: `Scam reported in ${place.locality}`,
      detail: results.length ? results.map((r) => r.doc.masked).join(', ') : 'No identifiers',
      scamType: input.scamType,
      locality: place.locality,
      ref: report.id,
    });
    for (const { doc } of results.filter((r) => r.confirmedNow)) {
      await publish({
        type: 'ioc',
        severity: 'warning',
        title: `${doc.masked} confirmed by ${doc.reportCount} reports`,
        detail: 'Now blocked before it rings on every Satark phone.',
        scamType: doc.scamType,
        locality: place.locality,
      });
    }
  }
  return { report, iocs: results.map((r) => r.doc) };
}

/** Indicators changed since `since` (ms), in the phone's CommunityIoc shape. */
export async function syncIocs(since: number) {
  const docs = await Ioc.find({ updatedAt: { $gt: new Date(since) } }).sort({ updatedAt: 1 }).limit(5000).lean();
  return docs.map((d) => ({
    hash: d.hash,
    type: d.type,
    masked: d.masked,
    reportCount: d.reportCount,
    status: d.status,
    scamType: d.scamType,
    firstSeen: d.firstSeen.getTime(),
    lastSeen: d.lastSeen.getTime(),
    origin: 'community' as const,
  }));
}
