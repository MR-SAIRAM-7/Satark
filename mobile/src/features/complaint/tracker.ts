import { FIR_STAGES, formatInr, STAGE_MESSAGE } from '@satark/shared';

import { api, type CaseSync } from '@/services/api';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import type { Complaint, FirStageId, WhatsAppMessage } from '@/types';

/**
 * FIR tracker. Each stage reached is recorded on the complaint and announced to
 * the elder and the guardian on WhatsApp (Twilio, through the backend).
 *
 * With a backend the case lives on the server: stages the victim reaches are
 * sent there and the server messages the family (so nothing is sent twice),
 * and stages the cyber cell sets come back through `refreshCase`. Without one,
 * the phone records the stages and sends the messages itself.
 *
 * What Satark automates: the complaint text, evidence hashing, the Zero FIR
 * letter, pre-filling every portal field, tracking, and the status messages.
 * What it deliberately does not: submitting on cybercrime.gov.in. That needs
 * the victim's own OTP and a captcha, there is no public API, and filing in
 * someone's name without them is exactly what a scam tool would do.
 */

const getComplaint = (id: string) => useComplaints.getState().complaints.find((c) => c.id === id);

/** Stages the victim reaches themselves; the rest are set by the cyber cell. */
const VICTIM_STAGES = new Set<FirStageId>(['helpline_1930', 'portal_filed', 'acknowledged']);
const hasBackend = () => api.mode === 'backend';

/** Send one WhatsApp message per recipient and record its delivery state. */
export async function sendWhatsAppUpdate(complaintId: string, body: string, attachment?: string): Promise<void> {
  const { elder, guardian } = useSettings.getState();
  const store = useComplaints.getState();
  const recipients: { to: WhatsAppMessage['to']; phone: string }[] = [
    { to: 'elder', phone: elder.phone },
    ...(guardian ? [{ to: 'guardian' as const, phone: guardian.phone }] : []),
  ];

  await Promise.all(
    recipients.map(async ({ to, phone }) => {
      const message: WhatsAppMessage = { id: newId('wa'), at: Date.now(), to, body, attachment, status: 'queued' };
      store.addWhatsApp(complaintId, message);
      const status = phone ? await api.sendWhatsApp({ to: phone, body }).catch(() => 'failed' as const) : 'demo';
      store.patchWhatsApp(complaintId, message.id, { status });
    }),
  );
}

/** The WhatsApp text for a stage of this complaint. */
export function stageMessage(complaint: Complaint, stage: FirStageId): string {
  const { elder } = useSettings.getState();
  return STAGE_MESSAGE[stage]({
    name: elder.name || 'you',
    ref: complaint.caseRef ?? complaint.id.toUpperCase(),
    amount: complaint.transaction ? formatInr(complaint.transaction.amount) : null,
    ack: complaint.ackNumber,
    fir: complaint.firNumber,
  });
}

/** Bring the phone's tracker in line with the server: stages (including the police's), numbers, messages sent. */
export function applyCaseSync(complaintId: string, sync: CaseSync): void {
  const store = useComplaints.getState();
  const complaint = getComplaint(complaintId);
  if (!complaint) return;
  store.patch(complaintId, {
    caseRef: sync.ref,
    ...(sync.ackNumber ? { ackNumber: sync.ackNumber } : {}),
    ...(sync.firNumber ? { firNumber: sync.firNumber } : {}),
  });
  for (const event of sync.timeline) {
    store.addEvent(complaintId, { stage: event.stage, at: Date.parse(event.at) || Date.now(), note: event.note });
  }
  const known = new Set(complaint.whatsapp.map((m) => m.id));
  for (const m of sync.messages) {
    if (m.channel !== 'whatsapp' || m.status === 'skipped' || (m.audience !== 'elder' && m.audience !== 'guardian')) continue;
    const id = `srv_${m.id}`;
    const status = deliveryState(m.status);
    // Twilio's receipts move a message on (sent, delivered, read) after it was first recorded.
    if (known.has(id)) {
      store.patchWhatsApp(complaintId, id, { status });
      continue;
    }
    store.addWhatsApp(complaintId, {
      id,
      at: Date.parse(m.createdAt) || Date.now(),
      to: m.audience,
      body: m.body,
      attachment: m.purpose === 'kit_ready' ? 'Satark_Complaint_Kit.pdf' : undefined,
      status,
    });
  }
}

/** The server's delivery state, in the tracker's terms ("read" shows as delivered). */
function deliveryState(status: CaseSync['messages'][number]['status']): WhatsAppMessage['status'] {
  if (status === 'delivered' || status === 'read') return 'delivered';
  if (status === 'sent' || status === 'failed') return status;
  return 'demo';
}

/** Fetch the case from the server (stages the cyber cell has set since). */
export async function refreshCase(complaintId: string): Promise<void> {
  const ref = getComplaint(complaintId)?.caseRef;
  if (!ref) return;
  const sync = await api.getCase(ref);
  if (sync) applyCaseSync(complaintId, sync);
}

export async function advanceStage(complaintId: string, stage: FirStageId, note?: string): Promise<void> {
  const before = getComplaint(complaintId);
  if (!before || before.timeline.some((e) => e.stage === stage)) return;

  // The server owns a filed case: it records the stage and messages the family itself.
  if (hasBackend() && before.caseRef && VICTIM_STAGES.has(stage)) {
    const sync = await api.updateCase(before.caseRef, stage as 'helpline_1930' | 'portal_filed' | 'acknowledged', before.ackNumber ?? undefined);
    if (sync) {
      applyCaseSync(complaintId, sync);
      return;
    }
  }

  useComplaints.getState().addEvent(complaintId, { stage, at: Date.now(), note });
  // With a backend, the kit-ready message goes out when the case is filed (see builder.ts).
  if (hasBackend() && stage === 'kit_ready') return;

  const complaint = getComplaint(complaintId);
  if (!complaint?.updatesEnabled) return;
  await sendWhatsAppUpdate(complaintId, stageMessage(complaint, stage), stage === 'kit_ready' ? 'Satark_Complaint_Kit.pdf' : undefined);
}

/** The next stage this complaint has not reached yet, or null when complete. */
export function nextStage(complaintId: string): FirStageId | null {
  const complaint = getComplaint(complaintId);
  if (!complaint) return null;
  const done = new Set(complaint.timeline.map((e) => e.stage));
  return FIR_STAGES.find((s) => !done.has(s)) ?? null;
}

/** Save the acknowledgement number the user was given, and move the tracker on. */
export async function saveAcknowledgement(complaintId: string, ackNumber: string): Promise<void> {
  const value = ackNumber.trim();
  if (!value) return;
  useComplaints.getState().patch(complaintId, { ackNumber: value });
  await advanceStage(complaintId, 'portal_filed');
  await advanceStage(complaintId, 'acknowledged');
}

/** Demo only: practice numbers that can never be mistaken for real ones. */
export const demoAckNumber = () => `DEMO-${Date.now().toString().slice(-8)}`;
export const demoFirNumber = () => `DEMO-FIR-${Math.floor(100 + Math.random() * 900)}/2026`;

/**
 * Demo mode: walk the complaint to its next stage, as the judges watch the
 * tracker and the WhatsApp log update. With the backend, the same stages are
 * driven by real events (the user's acknowledgement number, the cyber cell's
 * updates on the dashboard).
 */
export async function advanceDemo(complaintId: string): Promise<FirStageId | null> {
  const stage = nextStage(complaintId);
  if (!stage) return null;
  const store = useComplaints.getState();
  if (stage === 'acknowledged' && !getComplaint(complaintId)?.ackNumber) {
    store.patch(complaintId, { ackNumber: demoAckNumber() });
  }
  if (stage === 'zero_fir') store.patch(complaintId, { firNumber: demoFirNumber() });
  await advanceStage(complaintId, stage);
  return stage;
}
