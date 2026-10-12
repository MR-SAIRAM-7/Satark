/**
 * Complaint cases (F11, F12) - the automated part of filing.
 *
 * Satark automates everything up to the point the law requires the victim:
 * the complaint text in the portal's sections, SHA-256 hashing of every
 * evidence item, the Zero FIR letter, the Complaint Kit PDF, filing the case
 * into the partner cyber cell's queue (the police dashboard), WhatsApp updates
 * at every stage, golden-hour reminders and the bank freeze request.
 *
 * It never submits to cybercrime.gov.in: there is no public API, filing needs
 * the victim's own OTP and a captcha, and filing in someone's name without
 * them is exactly what a scam tool would do.
 */
import {
  buildNarrative,
  buildScript,
  buildSummary,
  FIR_STAGES,
  formatInr,
  kitHtml,
  maskPhone,
  SCAM_TYPES,
  STAGE_MESSAGE,
  TXN_ALERT_WINDOW_MIN,
  type FirStageId,
  type KitComplaint,
  type KitEvidence,
  type LangCode,
  type ParsedTxn,
  type ScamType,
} from '@satark/shared';

import { Check, Complaint, User, audit, type ComplaintDoc } from '../db/models';
import { encrypt, randomCode, sha256 } from '../lib/crypto';
import { locate } from '../lib/geo';
import { raiseAlert } from './alerts';
import { recordEmail, sendWhatsApp } from './notify';
import { htmlToPdf } from './pdf';
import { emitToPolice, emitToUser, publish } from './realtime';
import { fileUrl, putFile } from './storage';

const GOLDEN_HOUR_MS = TXN_ALERT_WINDOW_MIN * 60_000;

export interface PersonInput {
  name?: string;
  phone?: string | null;
  relation?: string;
}

export interface CaseInput {
  userId?: string;
  clientId?: string;
  /** Phone-side ids of the checks behind this case (for de-duplication). */
  relatedClientIds?: string[];
  source: ComplaintDoc['source'];
  scamType: ScamType;
  lang?: string;
  locality?: string;
  elder: PersonInput;
  guardian?: PersonInput | null;
  narrative?: string;
  summary?: string;
  suspect?: { phones?: string[]; upiIds?: string[]; links?: string[] };
  transaction?: (ParsedTxn & { at: number }) | null;
  evidence?: Omit<KitEvidence, 'sha256'>[];
  /** How the scammer made contact, for the narrative ("WhatsApp", "a phone call"). */
  channel?: string;
  at?: Date;
}

const person = (p: PersonInput | null | undefined) =>
  p ? { name: p.name ?? '', relation: p.relation, ...(p.phone ? { phoneEnc: encrypt(p.phone), phoneMasked: maskPhone(p.phone) } : {}) } : undefined;

const newRef = () => `SAT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${randomCode(4)}`;

export function toKit(c: ComplaintDoc): KitComplaint {
  return {
    id: c.ref,
    createdAt: c.createdAt.getTime(),
    scamType: c.scamType as ScamType,
    narrative: c.narrative ?? '',
    summary: c.summary ?? '',
    suspect: { phones: c.suspect?.phones ?? [], upiIds: c.suspect?.upiIds ?? [], links: c.suspect?.links ?? [] },
    transaction: c.transaction?.amount
      ? {
          type: (c.transaction.type as 'debit' | 'credit') ?? 'debit',
          amount: c.transaction.amount,
          bank: c.transaction.bank ?? undefined,
          accountTail: c.transaction.accountTail ?? undefined,
          reference: c.transaction.reference ?? undefined,
          payee: c.transaction.payee ?? undefined,
          payeeVpa: c.transaction.payeeVpa ?? undefined,
          at: c.transaction.at ?? c.createdAt.getTime(),
        }
      : null,
    evidence: (c.evidence ?? []).map((e) => ({ kind: e.kind!, label: e.label ?? '', content: e.content ?? '', at: e.at ?? 0, sha256: e.sha256 ?? '' })),
    ackNumber: c.ackNumber ?? null,
  };
}

/** Render (or re-render) the kit, store it, and return a short-lived link. */
export async function buildKit(c: ComplaintDoc): Promise<{ url: string; sha256: string; format: 'pdf' | 'html' }> {
  const html = kitHtml(toKit(c), { name: c.elder?.name ?? '', locality: c.locality ?? 'Hyderabad', lang: (c.lang ?? 'en') as LangCode });
  const pdf = await htmlToPdf(html);
  const format = pdf ? 'pdf' : 'html';
  const body = pdf ?? Buffer.from(html, 'utf8');
  const key = `kits/${c.ref}.${format}`;
  await putFile(key, body, pdf ? 'application/pdf' : 'text/html; charset=utf-8');
  c.pdf = { key, sha256: sha256(body), format };
  await c.save();
  return { url: await fileUrl(key), sha256: c.pdf.sha256!, format };
}

export async function kitLink(c: ComplaintDoc) {
  if (!c.pdf?.key) return buildKit(c);
  return { url: await fileUrl(c.pdf.key), sha256: c.pdf.sha256 ?? '', format: (c.pdf.format ?? 'pdf') as 'pdf' | 'html' };
}

const stageContext = (c: ComplaintDoc) => ({
  name: c.elder?.name || 'you',
  ref: c.ref,
  amount: c.transaction?.amount ? formatInr(c.transaction.amount) : null,
  ack: c.ackNumber ?? null,
  fir: c.firNumber ?? null,
});

/** WhatsApp the elder and the guardian (Twilio, or recorded in demo mode). */
async function notifyFamily(c: ComplaintDoc, body: string, purpose: string, mediaUrl?: string) {
  const meta = { encrypted: true, purpose, complaint: c._id, mediaUrl };
  await sendWhatsApp(c.elder?.phoneEnc, body, { ...meta, audience: 'elder' });
  if (c.guardian) await sendWhatsApp(c.guardian.phoneEnc, body, { ...meta, audience: 'guardian' });
}

function caseView(c: ComplaintDoc) {
  return { ...c.toJSON(), scamLabel: SCAM_TYPES[c.scamType as ScamType].label.en };
}

/** File a new case into the cyber-cell queue and start the automated updates. */
export async function createCase(input: CaseInput): Promise<ComplaintDoc> {
  const now = input.at ?? new Date();
  const place = locate(input.locality);
  const lang = input.lang ?? 'en';
  const evidence = (input.evidence ?? []).map((e) => ({ ...e, sha256: sha256(e.content) }));
  const transaction = input.transaction ?? null;
  if (transaction) {
    const content = `Debit of ${formatInr(transaction.amount)}${transaction.bank ? ` from ${transaction.bank}` : ''}${
      transaction.reference ? `, reference ${transaction.reference}` : ''
    }${transaction.payee ?? transaction.payeeVpa ? `, to ${transaction.payee ?? transaction.payeeVpa}` : ''}`;
    evidence.push({ kind: 'transaction', label: 'Bank debit alert', content, at: transaction.at, sha256: sha256(content) });
  }
  const suspect = {
    phones: [...new Set(input.suspect?.phones ?? [])],
    upiIds: [...new Set([...(input.suspect?.upiIds ?? []), ...(transaction?.payeeVpa ? [transaction.payeeVpa] : [])])],
    links: [...new Set(input.suspect?.links ?? [])],
  };
  const scamType = input.scamType;
  const firstAt = Math.min(...evidence.map((e) => e.at).filter(Boolean), now.getTime());

  const inGoldenHour = transaction ? now.getTime() - transaction.at < GOLDEN_HOUR_MS : false;
  const draft = { scamType, suspect, transaction, evidence, createdAt: now.getTime() };
  const complaint = await Complaint.create({
    ref: newRef(),
    user: input.userId,
    clientId: input.clientId,
    clientIds: [...new Set([input.clientId, ...(input.relatedClientIds ?? [])].filter((id): id is string => Boolean(id)))],
    source: input.source,
    scamType,
    elder: person(input.elder),
    guardian: person(input.guardian),
    lang,
    locality: place.locality,
    geo: { lat: place.lat, lng: place.lng },
    narrative:
      input.narrative ||
      buildNarrative({ name: input.elder.name ?? '', locality: place.locality, complaint: draft, channel: input.channel ?? 'a message', firstAt }),
    summary: input.summary || buildSummary(draft, lang as LangCode),
    suspect,
    transaction: transaction ?? undefined,
    evidence,
    stage: 'kit_ready',
    timeline: [{ stage: 'kit_ready', at: now, by: 'Satark', note: 'Complaint Kit generated and filed to the cyber cell queue' }],
    priority: inGoldenHour ? 'golden_hour' : transaction ? 'high' : 'normal',
    goldenHourEndsAt: transaction ? new Date(transaction.at + GOLDEN_HOUR_MS) : undefined,
    createdAt: now,
  });

  const kit = await buildKit(complaint).catch(() => null);
  await notifyFamily(complaint, STAGE_MESSAGE.kit_ready(stageContext(complaint)), 'kit_ready', kit?.url);

  const amount = transaction ? ` · ${formatInr(transaction.amount)} lost` : '';
  await publish({
    type: 'case',
    severity: inGoldenHour ? 'critical' : 'warning',
    title: `${inGoldenHour ? 'GOLDEN HOUR · ' : ''}New case ${complaint.ref}${amount}`,
    detail: `${SCAM_TYPES[scamType].label.en} · ${place.locality}`,
    scamType,
    locality: place.locality,
    ref: complaint.id,
  });
  emitToPolice('case:new', caseView(complaint));
  if (inGoldenHour) {
    await raiseAlert({
      elderId: input.userId,
      kind: 'golden_hour',
      severity: 'critical',
      title: `Money lost: ${formatInr(transaction!.amount)} - golden hour running`,
      summary: `Call 1930 now with reference ${transaction!.reference ?? complaint.ref}. The bank can still hold the money.`,
      score: 95,
      scamType,
      complaintId: complaint._id,
      locality: place.locality,
    });
  }
  await audit('case.filed', input.userId ?? 'satark', complaint.ref, { source: input.source, priority: complaint.priority });
  return complaint;
}

/**
 * The phone files a kit for a conversation the server already opened a case for
 * (a golden-hour case). Fold the phone's fuller account into that case instead
 * of creating a second one; the family has already had the kit-ready message.
 */
export async function mergeIntoCase(complaint: ComplaintDoc, input: CaseInput): Promise<ComplaintDoc> {
  const known = new Set(complaint.evidence.map((e) => e.sha256));
  for (const e of input.evidence ?? []) {
    const hash = sha256(e.content);
    if (!known.has(hash)) complaint.evidence.push({ ...e, sha256: hash });
  }
  const merge = (a: string[] | undefined, b: string[] | undefined) => [...new Set([...(a ?? []), ...(b ?? [])])];
  complaint.suspect = {
    phones: merge(complaint.suspect?.phones, input.suspect?.phones),
    upiIds: merge(complaint.suspect?.upiIds, input.suspect?.upiIds),
    links: merge(complaint.suspect?.links, input.suspect?.links),
  };
  if (input.narrative) complaint.narrative = input.narrative;
  if (input.summary) complaint.summary = input.summary;
  if (input.elder?.phone && !complaint.elder?.phoneEnc) {
    complaint.set('elder', { ...person(input.elder), name: complaint.elder?.name || input.elder.name || '' });
  }
  if (input.guardian?.phone && !complaint.guardian?.phoneEnc) complaint.set('guardian', person(input.guardian));
  complaint.clientIds = merge(complaint.clientIds, [input.clientId, ...(input.relatedClientIds ?? [])].filter((id): id is string => Boolean(id)));
  await complaint.save();
  await buildKit(complaint).catch(() => null);
  emitToPolice('case:update', caseView(complaint));
  return complaint;
}

export interface StageUpdate {
  stage: FirStageId;
  note?: string;
  by: string;
  ackNumber?: string;
  firNumber?: string;
  assignedTo?: string;
}

/** Move a case on. Every stage reached is announced to the family on WhatsApp. */
export async function advanceCase(complaint: ComplaintDoc, update: StageUpdate): Promise<ComplaintDoc> {
  if (update.ackNumber) complaint.ackNumber = update.ackNumber;
  if (update.firNumber) complaint.firNumber = update.firNumber;
  if (update.assignedTo) complaint.assignedTo = update.assignedTo;

  const already = complaint.timeline.some((e) => e.stage === update.stage);
  if (!already) {
    complaint.timeline.push({ stage: update.stage, at: new Date(), note: update.note, by: update.by });
    const furthest = Math.max(...complaint.timeline.map((e) => FIR_STAGES.indexOf(e.stage as FirStageId)));
    complaint.stage = FIR_STAGES[furthest]!;
  }
  await complaint.save();

  if (!already) {
    if (complaint.updatesEnabled) {
      await notifyFamily(complaint, STAGE_MESSAGE[update.stage](stageContext(complaint)), update.stage);
    }
    if (update.stage === 'bank_hold' && complaint.transaction?.amount) await requestBankHold(complaint);
    await publish({
      type: 'case',
      severity: 'info',
      title: `${complaint.ref}: ${update.stage.replace(/_/g, ' ')}`,
      detail: update.note ?? `Updated by ${update.by}`,
      scamType: complaint.scamType,
      locality: complaint.locality,
      ref: complaint.id,
    });
    await audit('case.stage', update.by, complaint.ref, { stage: update.stage });
  }
  emitToPolice('case:update', caseView(complaint));
  if (complaint.user) emitToUser(complaint.user, 'case:update', caseView(complaint));
  return complaint;
}

/** Freeze request to the bank's nodal officer, drafted from the case. */
async function requestBankHold(c: ComplaintDoc) {
  const t = c.transaction!;
  const body = [
    `Subject: Request to hold / freeze proceeds of cyber fraud - ${c.ref}`,
    '',
    `Amount: ${formatInr(t.amount!)} · Debited: ${t.at ? new Date(t.at).toLocaleString('en-IN') : 'see kit'}`,
    `UTR / reference: ${t.reference ?? 'see kit'} · Beneficiary: ${t.payee ?? t.payeeVpa ?? 'see kit'}`,
    `Complaint acknowledgement: ${c.ackNumber ?? 'pending'} · Victim locality: ${c.locality}`,
    '',
    'Please place a lien on the beneficiary account under the I4C / CFCFRMS procedure and confirm the held amount.',
  ].join('\n');
  await recordEmail(`Nodal officer, ${t.bank ?? 'beneficiary bank'}`, body, { audience: 'bank', purpose: 'bank_hold', complaint: c._id });
}

/** The user typed in the acknowledgement number from 1930 or the portal. */
export async function saveAcknowledgement(c: ComplaintDoc, ackNumber: string, by: string) {
  await advanceCase(c, { stage: 'helpline_1930', by, note: 'Reported to 1930' });
  await advanceCase(c, { stage: 'portal_filed', by });
  return advanceCase(c, { stage: 'acknowledged', by, ackNumber });
}

/**
 * F11: a debit soon after a high-risk check opens a golden-hour case
 * automatically, with the whole conversation as evidence.
 */
export async function goldenHourCase(input: {
  userId: string;
  txn: ParsedTxn;
  at: number;
  relatedClientId?: string;
}): Promise<{ complaint: ComplaintDoc; minutesAfter: number; script: string[] } | null> {
  if (input.txn.type !== 'debit') return null;
  const since = new Date(input.at - GOLDEN_HOUR_MS);
  const related = input.relatedClientId
    ? await Check.findOne({ clientId: input.relatedClientId, user: input.userId })
    : await Check.findOne({ user: input.userId, verdict: { $ne: 'safe' }, score: { $gte: 70 }, createdAt: { $gte: since, $lte: new Date(input.at) } }).sort({
        createdAt: -1,
      });
  if (!related) return null;

  const thread = related.threadId
    ? await Check.find({ user: input.userId, threadId: related.threadId, verdict: { $ne: 'safe' } }).sort({ createdAt: 1 }).limit(20)
    : [related];
  const user = await User.findById(input.userId);
  const complaint = await createCase({
    userId: input.userId,
    clientId: related.clientId ?? undefined,
    relatedClientIds: thread.map((c) => c.clientId).filter((id): id is string => Boolean(id)),
    source: 'golden_hour',
    scamType: related.scamType as ScamType,
    lang: user?.lang ?? 'en',
    locality: user?.locality ?? related.locality ?? undefined,
    elder: { name: user?.name ?? '' },
    channel: related.source === 'call' || related.source === 'transcript' ? 'a phone call' : related.source === 'whatsapp' ? 'WhatsApp' : 'SMS',
    evidence: thread.map((c) => ({
      kind: c.source === 'call' ? 'call' : c.source === 'transcript' ? 'transcript' : 'message',
      label: `${c.source === 'whatsapp' ? 'WhatsApp message' : c.source === 'sms' ? 'SMS' : 'Message'}${c.senderMasked ? ` from ${c.senderMasked}` : ''}`,
      content: c.maskedText,
      at: c.createdAt.getTime(),
    })),
    transaction: { ...input.txn, at: input.at },
  });
  // Use the user's own encrypted number if the case has none.
  if (user?.phoneEnc && !complaint.elder?.phoneEnc) {
    complaint.set('elder', { name: complaint.elder?.name ?? '', phoneEnc: user.phoneEnc, phoneMasked: user.phoneMasked ?? undefined });
    await complaint.save();
  }
  return {
    complaint,
    minutesAfter: Math.max(1, Math.round((input.at - related.createdAt.getTime()) / 60_000)),
    script: buildScript(toKit(complaint), (user?.lang ?? 'en') as LangCode),
  };
}

const REMINDER_MARKS = [10, 30, 50];

/** Job: golden-hour reminders until someone acts on the case (the family calls 1930, or the cyber cell moves it). */
export async function goldenHourReminders(now = new Date()): Promise<number> {
  const open = await Complaint.find({ priority: 'golden_hour', goldenHourEndsAt: { $gt: now }, stage: 'kit_ready' });
  let sent = 0;
  for (const c of open) {
    const started = c.goldenHourEndsAt!.getTime() - GOLDEN_HOUR_MS;
    const elapsed = Math.floor((now.getTime() - started) / 60_000);
    const due = REMINDER_MARKS.filter((m) => elapsed >= m && !c.reminders.includes(`golden-${m}`));
    if (due.length === 0) continue;
    c.reminders.push(...due.map((m) => `golden-${m}`));
    await c.save();
    const left = Math.max(1, 60 - elapsed);
    await notifyFamily(
      c,
      `Satark (${c.ref}): ${left} minutes left in the golden hour. Call 1930 now${c.transaction?.reference ? ` and give reference ${c.transaction.reference}` : ''}. Every minute counts for getting the money held.`,
      'golden_hour_reminder',
    );
    await publish({
      type: 'case',
      severity: 'critical',
      title: `${c.ref}: ${left} min left in golden hour, 1930 not yet called`,
      detail: c.transaction?.amount ? `${formatInr(c.transaction.amount)} at risk` : undefined,
      scamType: c.scamType,
      locality: c.locality,
      ref: c.id,
    });
    sent += 1;
  }
  return sent;
}

/** Job: nudge families whose case has not moved for two days. */
export async function staleCaseFollowUps(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const stale = await Complaint.find({ stage: { $in: ['kit_ready', 'helpline_1930', 'portal_filed'] }, updatedAt: { $lte: cutoff } }).limit(50);
  for (const c of stale) {
    const tag = `followup-${c.stage}`;
    if (c.reminders.includes(tag)) continue;
    c.reminders.push(tag);
    await c.save();
    await notifyFamily(
      c,
      `Satark (${c.ref}): your complaint is still at "${c.stage.replace(/_/g, ' ')}". If you have an acknowledgement number, add it in the Satark app so we can follow up with the cyber cell.`,
      'follow_up',
    );
  }
  return stale.length;
}
