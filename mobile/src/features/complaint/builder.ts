import { buildNarrative, buildSummary, formatInr, type ParsedTxn } from '@satark/shared';

import { translate } from '@/i18n';
import { sha256 } from '@/services/hash';
import { notify } from '@/services/notifications';
import { useAlerts } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import { useUi } from '@/store/ui';
import type { CheckRecord, Complaint, EvidenceItem } from '@/types';

import { renderKit } from './pdf';
import { advanceStage } from './tracker';

const CHANNEL: Partial<Record<CheckRecord['source'], string>> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  call: 'a phone call',
  transcript: 'a phone call',
};

const EVIDENCE_LABEL: Partial<Record<CheckRecord['source'], string>> = {
  whatsapp: 'WhatsApp message',
  sms: 'SMS',
  call: 'Call log entry',
  transcript: 'Call transcript (flagged lines)',
  qr: 'QR code payload',
  link: 'Link',
};

async function toEvidence(check: CheckRecord): Promise<EvidenceItem> {
  const from = check.sender ? ` from ${check.sender}` : '';
  return {
    id: check.id,
    kind: check.source === 'call' ? 'call' : check.source === 'transcript' ? 'transcript' : 'message',
    label: `${EVIDENCE_LABEL[check.source] ?? 'Message'}${from}`,
    content: check.text,
    at: check.createdAt,
    // Hash of the exact text as received: any later edit changes the hash.
    sha256: await sha256(check.text),
  };
}

async function txnEvidence(txn: ParsedTxn, at: number): Promise<EvidenceItem> {
  const content = `Debit of ${formatInr(txn.amount)}${txn.bank ? ` from ${txn.bank}` : ''}${
    txn.reference ? `, reference ${txn.reference}` : ''
  }${txn.payee ?? txn.payeeVpa ? `, to ${txn.payee ?? txn.payeeVpa}` : ''}`;
  return { id: newId('ev'), kind: 'transaction', label: 'Bank debit alert', content, at, sha256: await sha256(content) };
}

export interface BuildResult {
  complaint: Complaint;
  /** Seconds from tap to kit ready: the F12 metric (target under 30 s). */
  seconds: number;
}

/**
 * Build the Complaint Kit for a scam (F12): gather the whole conversation,
 * hash every evidence item, write the complaint, render the PDF, then start
 * the tracker - which sends the first WhatsApp update.
 */
export async function buildComplaint(checkId: string): Promise<BuildResult> {
  const started = Date.now();
  const { checks, threads } = useChecks.getState();
  const origin = checks.find((c) => c.id === checkId);
  if (!origin) throw new Error('Check not found');

  const settings = useSettings.getState();
  // The whole incident: this conversation, plus anything else the same number sent or said
  // within a day (a scammer who messages on WhatsApp and then calls is one case, not two).
  const sameSender = (c: CheckRecord) =>
    Boolean(origin.sender) &&
    c.response.verdict !== 'safe' &&
    c.sender?.replace(/\D/g, '').slice(-10) === origin.sender?.replace(/\D/g, '').slice(-10) &&
    Math.abs(c.createdAt - origin.createdAt) < 24 * 60 * 60 * 1000;
  const inThread = new Set(threads[origin.threadId]?.checkIds ?? [origin.id]);
  const related = checks.filter((c) => inThread.has(c.id) || sameSender(c)).sort((a, b) => a.createdAt - b.createdAt);
  const threadIds = new Set(related.map((c) => c.id));

  // A debit that followed this scam, if the golden-hour flow caught one.
  const lastTxn = useUi.getState().lastTxn;
  const linkedTxn = lastTxn && threadIds.has(lastTxn.relatedCheckId) ? lastTxn : null;
  const transaction = linkedTxn ? { ...linkedTxn.txn, at: linkedTxn.at } : null;

  const indicators = related.flatMap((c) => c.indicators);
  const unique = (type: string) => [...new Set(indicators.filter((i) => i.type === type).map((i) => i.value))];
  const suspect = {
    phones: unique('phone'),
    upiIds: [...new Set([...unique('upi'), ...(transaction?.payeeVpa ? [transaction.payeeVpa] : [])])],
    links: unique('domain'),
  };

  const evidence = await Promise.all(related.map(toEvidence));
  if (transaction) evidence.push(await txnEvidence(transaction, transaction.at));

  const draft: Complaint = {
    id: newId('sat'),
    createdAt: Date.now(),
    checkIds: related.map((c) => c.id),
    scamType: origin.response.scam_type,
    narrative: '',
    summary: '',
    suspect,
    transaction,
    evidence,
    pdfUri: null,
    pdfSha256: null,
    ackNumber: null,
    firNumber: null,
    timeline: [],
    whatsapp: [],
    updatesEnabled: true,
  };
  draft.narrative = buildNarrative({
    name: settings.elder.name,
    locality: settings.elder.locality,
    complaint: draft,
    channel: CHANNEL[origin.source] ?? 'a message',
    firstAt: related[0]?.createdAt ?? origin.createdAt,
  });
  draft.summary = buildSummary(draft, settings.lang);

  const pdf = await renderKit(draft, { name: settings.elder.name, locality: settings.elder.locality, lang: settings.lang })
    .catch(() => ({ uri: null, sha256: null }));
  const complaint: Complaint = { ...draft, pdfUri: pdf.uri, pdfSha256: pdf.sha256 };

  useComplaints.getState().add(complaint);
  useAlerts.getState().push({
    kind: 'complaint_ready',
    title: translate(settings.lang, 'alert.complaint_ready'),
    summary: complaint.summary,
    score: origin.response.score,
    scamType: complaint.scamType,
    complaintId: complaint.id,
  });
  notify(translate(settings.lang, 'alert.complaint_ready'), translate(settings.lang, 'kit.call1930'), {
    screen: 'complaint',
    complaintId: complaint.id,
  });
  await advanceStage(complaint.id, 'kit_ready');

  return { complaint, seconds: Math.max(1, Math.round((Date.now() - started) / 1000)) };
}
