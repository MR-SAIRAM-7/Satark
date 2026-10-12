/**
 * Demo seed: a believable fortnight of scam activity in Hyderabad, so the
 * dashboard, the case queue and the automations have something real to show.
 * Seeded randomness: the same demo every time.
 */
import {
  analyzeLocal,
  buildNarrative,
  buildSummary,
  FIR_STAGES,
  maskIndicator,
  maskPhone,
  SCAM_TYPES,
  STAGE_MESSAGE,
  formatInr,
  type LangCode,
  type ScamType,
} from '@satark/shared';
import type { Model, Types } from 'mongoose';

import {
  Alert,
  Audit,
  Campaign,
  Check,
  Complaint,
  Drill,
  FeedEvent,
  GuardianLink,
  Ioc,
  Message,
  Report,
  User,
} from '../db/models';
import { encrypt, indicatorHash, phoneHash, sha256 } from '../lib/crypto';
import { LOCALITIES, locate } from '../lib/geo';
import { logger } from '../lib/logger';
import { clusterCampaigns } from '../services/campaigns';
import { COMMUNITY_SEED, DEMO_CASES, DEMO_ELDERS, DEMO_POLICE, MESSAGES, SAFE_MESSAGES, TYPE_WEIGHTS } from './data';

const HOUR = 3_600_000;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const person = (p: { name: string; phone: string }) => ({ name: p.name, phoneHash: phoneHash(p.phone), phoneEnc: encrypt(p.phone), phoneMasked: maskPhone(p.phone) });

/** Busy localities get more reports; the weights are invented for the demo. */
const LOCALITY_WEIGHTS: [string, number][] = Object.keys(LOCALITIES).map((name, i) => [name, i < 6 ? 6 : i < 14 ? 3 : 1]);

export async function clearAll() {
  const models = [Alert, Audit, Campaign, Check, Complaint, Drill, FeedEvent, GuardianLink, Ioc, Message, Report, User] as unknown as Model<unknown>[];
  await Promise.all(models.map((m) => m.deleteMany({})));
}

export async function seed({ days = 14 } = {}) {
  const random = rng(20261012);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
  const weighted = <T>(items: [T, number][]) => {
    let r = random() * items.reduce((s, [, w]) => s + w, 0);
    for (const [item, w] of items) if ((r -= w) <= 0) return item;
    return items[0]![0];
  };
  const now = Date.now();
  /** A time of day between 08:00 and 22:00, most of it in the evening, when elders are home. */
  const timeOn = (daysAgo: number) => {
    const day = new Date(now - daysAgo * 24 * HOUR);
    day.setHours(8 + Math.floor(Math.pow(random(), 0.7) * 14), Math.floor(random() * 60), Math.floor(random() * 60));
    return Math.min(day.getTime(), now - 60_000);
  };

  await clearAll();

  // --- people -------------------------------------------------------------------------
  await User.insertMany(DEMO_POLICE.map((p) => ({ role: 'police', ...person(p), badge: p.badge, station: p.station })));
  const elders = await User.insertMany(
    DEMO_ELDERS.map((e, i) => ({ role: 'elder', ...person(e), lang: e.lang, locality: e.locality, deviceId: i === 0 ? 'demo-elder-lakshmi' : undefined })),
  );
  const guardians: (Types.ObjectId | null)[] = [];
  for (const [i, e] of DEMO_ELDERS.entries()) {
    if (!e.guardian) {
      guardians.push(null);
      continue;
    }
    const g = await User.create({ role: 'guardian', ...person(e.guardian), lang: 'en', locality: i === 0 ? 'Bengaluru' : e.locality });
    await GuardianLink.create({ elder: elders[i]!._id, guardian: g._id, relation: e.guardian.relation });
    guardians.push(g._id);
  }
  const homeGuardian = await User.create({ role: 'listener', name: 'Home Guardian (Lakshmi)', deviceId: 'demo-home-guardian', locality: 'Kukatpally', lang: 'te' });
  await GuardianLink.create({ elder: elders[0]!._id, guardian: homeGuardian._id, relation: 'home guardian phone' });

  // --- community intelligence --------------------------------------------------------------
  const iocs = await Ioc.insertMany(
    COMMUNITY_SEED.map((s) => ({
      type: s.type,
      hash: indicatorHash(s),
      masked: maskIndicator(s),
      value: s.type === 'phone' ? undefined : s.value,
      reportCount: s.reports,
      status: s.reports >= 3 ? 'confirmed' : 'suspected',
      scamType: s.scamType,
      firstSeen: new Date(now - (s.hoursAgo + 24 * 4) * HOUR),
      lastSeen: new Date(now - s.hoursAgo * HOUR),
    })),
  );
  const iocByHash = new Map(iocs.map((i) => [i.hash, i._id]));

  // --- a fortnight of checks and reports ---------------------------------------------------------
  const analyses = new Map<string, ReturnType<typeof analyzeLocal>>();
  const analyse = (m: { text: string; source: 'sms' | 'whatsapp' | 'call'; sender: string }) => {
    if (!analyses.has(m.text)) analyses.set(m.text, analyzeLocal({ text: m.text, source: m.source, sender: m.sender.replace(/X/g, '0') }));
    return analyses.get(m.text)!;
  };
  const checks: object[] = [];
  const reports: object[] = [];
  for (let d = 0; d < days; d++) {
    // Rising slightly towards today, so the trend chart tells a story.
    const count = Math.round(16 + random() * 10 + (days - d) * 0.9);
    for (let n = 0; n < count; n++) {
      const scamType = weighted(TYPE_WEIGHTS);
      const message = pick(MESSAGES[scamType] ?? MESSAGES.digital_arrest!);
      const local = analyse(message);
      const place = locate(weighted(LOCALITY_WEIGHTS));
      const at = new Date(timeOn(d));
      const elder = random() < 0.35 ? pick(elders) : null;
      const score = Math.max(72, Math.min(99, local.score + Math.round(random() * 12)));
      checks.push({
        user: elder?._id,
        source: message.source,
        channel: pick(['app', 'app', 'app', 'whatsapp']),
        maskedText: message.text,
        senderMasked: maskPhone(message.sender),
        verdict: 'scam',
        score,
        stage: Math.max(local.stage, 3),
        scamType,
        layerScores: { rules: local.ruleScore, killChain: local.killChainScore, community: 0, ml: Math.round(70 + random() * 25), ai: null },
        rules: local.rules.map((r) => r.id),
        tactics: local.tactics,
        engine: 'cached',
        locality: place.locality,
        geo: { lat: place.lat, lng: place.lng },
        latencyMs: Math.round(40 + random() * 160),
        createdAt: at,
        updatedAt: at,
      });
      if (random() < 0.75) {
        reports.push({
          user: elder?._id,
          scamType,
          locality: place.locality,
          geo: { lat: place.lat, lng: place.lng },
          iocs: local.indicators.map((i) => iocByHash.get(indicatorHash(i))).filter(Boolean),
          channel: message.source === 'call' ? 'call' : pick(['app', 'app', 'whatsapp']),
          maskedText: message.text,
          createdAt: at,
          updatedAt: at,
        });
      }
    }
    // Genuine messages people checked too: most of what Satark sees is safe.
    for (let n = 0; n < count * 2; n++) {
      const message = pick(SAFE_MESSAGES);
      const place = locate(weighted(LOCALITY_WEIGHTS));
      const at = new Date(timeOn(d));
      checks.push({
        source: message.source,
        maskedText: message.text,
        senderMasked: message.sender,
        verdict: random() < 0.08 ? 'suspicious' : 'safe',
        score: Math.round(random() * 45),
        stage: 0,
        scamType: 'unknown',
        layerScores: { rules: 0, killChain: 0, community: 0, ml: Math.round(random() * 30), ai: null },
        engine: 'cached',
        locality: place.locality,
        geo: { lat: place.lat, lng: place.lng },
        latencyMs: Math.round(30 + random() * 90),
        createdAt: at,
        updatedAt: at,
      });
    }
  }
  await Check.insertMany(checks, { timestamps: false } as never);
  await Report.insertMany(reports, { timestamps: false } as never);

  // --- the cyber cell's case queue -----------------------------------------------------------
  const messages: object[] = [];
  for (const [i, spec] of DEMO_CASES.entries()) {
    const e = DEMO_ELDERS[spec.elder]!;
    const createdAt = now - spec.hoursAgo * HOUR;
    const place = locate(e.locality);
    const samples = (MESSAGES[spec.scamType] ?? MESSAGES.digital_arrest!).slice(0, 2);
    const evidence = samples.map((m, n) => ({
      kind: m.source === 'call' ? ('call' as const) : ('message' as const),
      label: `${m.source === 'whatsapp' ? 'WhatsApp message' : m.source === 'sms' ? 'SMS' : 'Call log entry'} from ${maskPhone(m.sender)}`,
      content: m.text,
      at: createdAt - (40 - n * 12) * 60_000,
      sha256: sha256(m.text),
    }));
    const transaction = spec.txn ? { type: 'debit' as const, ...spec.txn, at: createdAt - 4 * 60_000 } : null;
    if (transaction) {
      const content = `Debit of ${formatInr(transaction.amount)} from ${transaction.bank}, reference ${transaction.reference}`;
      evidence.push({ kind: 'transaction' as never, label: 'Bank debit alert', content, at: transaction.at, sha256: sha256(content) });
    }
    const indicators = samples.flatMap((m) => analyse(m).indicators);
    const suspect = {
      phones: [...new Set(samples.map((m) => maskPhone(m.sender)))],
      upiIds: [...new Set([...indicators.filter((x) => x.type === 'upi').map((x) => x.value), ...(spec.txn?.payeeVpa ? [spec.txn.payeeVpa] : [])])],
      links: [...new Set(indicators.filter((x) => x.type === 'domain').map((x) => x.value))],
    };
    const draft = { scamType: spec.scamType, suspect, transaction, evidence, createdAt };
    const reached = FIR_STAGES.slice(0, FIR_STAGES.indexOf(spec.stage) + 1);
    const step = (spec.hoursAgo * HOUR * 0.8) / Math.max(1, reached.length);
    const timeline = reached.map((stage, n) => ({
      stage,
      at: new Date(createdAt + n * step),
      by: n === 0 ? 'Satark' : n < 3 ? e.name : pick(DEMO_POLICE).name,
      note: n === 0 ? 'Complaint Kit generated and filed to the cyber cell queue' : undefined,
    }));
    const ref = `SAT-${new Date(createdAt).toISOString().slice(2, 10).replace(/-/g, '')}-${String(4100 + i * 37).slice(-4)}`;
    const golden = Boolean(transaction && spec.hoursAgo < 1);
    const complaint = await Complaint.create({
      ref,
      user: elders[spec.elder]!._id,
      source: golden ? 'golden_hour' : 'app',
      scamType: spec.scamType,
      elder: { name: e.name, phoneEnc: encrypt(e.phone), phoneMasked: maskPhone(e.phone) },
      guardian: e.guardian ? { name: e.guardian.name, phoneEnc: encrypt(e.guardian.phone), phoneMasked: maskPhone(e.guardian.phone), relation: e.guardian.relation } : undefined,
      lang: e.lang,
      locality: place.locality,
      geo: { lat: place.lat, lng: place.lng },
      narrative: buildNarrative({ name: e.name, locality: place.locality, complaint: draft, channel: samples[0]!.source === 'call' ? 'a phone call' : 'WhatsApp', firstAt: evidence[0]!.at }),
      summary: buildSummary(draft, e.lang as LangCode),
      suspect,
      transaction: transaction ?? undefined,
      evidence,
      ackNumber: reached.includes('acknowledged') ? `3160${String(5000000 + i * 7919).slice(-7)}` : undefined,
      firNumber: reached.includes('zero_fir') ? `${120 + i}/2026` : undefined,
      stage: spec.stage,
      timeline,
      priority: golden ? 'golden_hour' : transaction ? 'high' : 'normal',
      goldenHourEndsAt: transaction ? new Date(transaction.at + HOUR) : undefined,
      assignedTo: reached.includes('io_assigned') ? 'SI Fatima Begum' : undefined,
      createdAt: new Date(createdAt),
    });
    const ctx = { name: e.name, ref, amount: transaction ? formatInr(transaction.amount) : null, ack: complaint.ackNumber ?? null, fir: complaint.firNumber ?? null };
    for (const t of timeline) {
      for (const audience of ['elder', 'guardian'] as const) {
        if (audience === 'guardian' && !e.guardian) continue;
        const phone = audience === 'elder' ? e.phone : e.guardian!.phone;
        messages.push({ channel: 'whatsapp', toMasked: maskPhone(phone), audience, body: STAGE_MESSAGE[t.stage](ctx), status: 'demo', purpose: t.stage, complaint: complaint._id, createdAt: t.at, updatedAt: t.at });
      }
    }
    if (golden) {
      await Alert.create({
        elder: elders[spec.elder]!._id,
        kind: 'golden_hour',
        severity: 'critical',
        title: `Money lost: ${formatInr(transaction!.amount)} - golden hour running`,
        summary: `Call 1930 now with reference ${transaction!.reference}. The bank can still hold the money.`,
        score: 95,
        scamType: spec.scamType,
        complaint: complaint._id,
        locality: place.locality,
        ackedAt: new Date(createdAt + 3 * 60_000),
        ackedBy: e.guardian?.name ?? 'Cyber cell',
        createdAt: new Date(createdAt),
      });
    }
  }
  await Message.insertMany(messages, { timestamps: false } as never);

  // --- family alerts: one critical alert is still unacknowledged, so escalation fires live ---------
  const alertSpecs: [number, ScamType, number, boolean][] = [
    [0, 'digital_arrest', 0.05, false],
    [0, 'kyc_bank', 26, true],
    [1, 'investment', 8, true],
    [3, 'electricity', 11, true],
    [6, 'courier', 30, true],
    [9, 'digital_arrest', 3.2, true],
  ];
  for (const [index, scamType, hoursAgo, acked] of alertSpecs) {
    const e = DEMO_ELDERS[index]!;
    const at = new Date(now - hoursAgo * HOUR);
    await Alert.create({
      elder: elders[index]!._id,
      kind: 'scam_message',
      severity: hoursAgo < 1 ? 'critical' : 'warning',
      title: `${e.name} received a ${SCAM_TYPES[scamType].label.en.toLowerCase()}`,
      summary: SCAM_TYPES[scamType].explanation.en,
      score: 92,
      scamType,
      locality: e.locality,
      ...(acked ? { ackedAt: new Date(at.getTime() + 4 * 60_000), ackedBy: e.guardian?.name ?? 'Cyber cell' } : {}),
      createdAt: at,
    });
  }

  // --- the dashboard feed's recent history --------------------------------------------------------
  const recent = (reports as { scamType: ScamType; locality: string; geo: object; createdAt: Date }[])
    .filter((r) => r.createdAt.getTime() > now - 8 * HOUR)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  await FeedEvent.insertMany(
    [
      ...recent.map((r) => ({
        type: 'report',
        severity: 'warning',
        title: `Scam reported in ${r.locality}`,
        detail: SCAM_TYPES[r.scamType].label.en,
        scamType: r.scamType,
        locality: r.locality,
        geo: r.geo,
        createdAt: r.createdAt,
      })),
      ...DEMO_CASES.filter((c) => c.hoursAgo < 8).map((c) => ({
        type: 'case',
        severity: c.txn && c.hoursAgo < 1 ? 'critical' : 'warning',
        title: `${c.txn && c.hoursAgo < 1 ? 'GOLDEN HOUR · ' : ''}New case${c.txn ? ` · ${formatInr(c.txn.amount)} lost` : ''}`,
        detail: `${SCAM_TYPES[c.scamType].label.en} · ${DEMO_ELDERS[c.elder]!.locality}`,
        scamType: c.scamType,
        locality: DEMO_ELDERS[c.elder]!.locality,
        createdAt: new Date(now - c.hoursAgo * HOUR),
      })),
    ],
    { timestamps: false } as never,
  );

  // --- scam drills: the guardian's readiness score -----------------------------------------------
  await Drill.insertMany(
    elders.flatMap((e, i) =>
      Array.from({ length: 6 }, (_, n) => ({ user: e._id, scenario: pick(['digital-arrest', 'kyc-link', 'upi-qr', 'genuine-otp', 'family']), passed: random() < (i === 0 ? 0.7 : 0.6), createdAt: new Date(now - (n + 1) * 26 * HOUR) })),
    ),
    { timestamps: false } as never,
  );

  const campaigns = await clusterCampaigns();
  const counts = {
    users: await User.countDocuments(),
    checks: checks.length,
    reports: reports.length,
    iocs: iocs.length,
    cases: DEMO_CASES.length,
    campaigns,
    homeGuardian: homeGuardian.id,
  };
  logger.info(counts, 'demo data seeded');
  return counts;
}
