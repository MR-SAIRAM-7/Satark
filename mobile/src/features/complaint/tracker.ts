import { formatInr } from '@satark/shared';

import { api } from '@/services/api';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import type { FirStageId, WhatsAppMessage } from '@/types';

import { FIR_STAGES, STAGE_MESSAGE } from './content';

/**
 * FIR tracker. Each stage reached is recorded on the complaint and announced to
 * the elder and the guardian on WhatsApp (Twilio, through the backend).
 *
 * What Satark automates: the complaint text, evidence hashing, the Zero FIR
 * letter, pre-filling every portal field, tracking, and the status messages.
 * What it deliberately does not: submitting on cybercrime.gov.in. That needs
 * the victim's own OTP and a captcha, there is no public API, and filing in
 * someone's name without them is exactly what a scam tool would do.
 */

const getComplaint = (id: string) => useComplaints.getState().complaints.find((c) => c.id === id);

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

export async function advanceStage(complaintId: string, stage: FirStageId, note?: string): Promise<void> {
  const before = getComplaint(complaintId);
  if (!before || before.timeline.some((e) => e.stage === stage)) return;

  useComplaints.getState().addEvent(complaintId, { stage, at: Date.now(), note });
  const complaint = getComplaint(complaintId);
  if (!complaint?.updatesEnabled) return;

  const { elder } = useSettings.getState();
  const body = STAGE_MESSAGE[stage]({
    name: elder.name || 'you',
    ref: complaint.id.toUpperCase(),
    amount: complaint.transaction ? formatInr(complaint.transaction.amount) : null,
    ack: complaint.ackNumber,
    fir: complaint.firNumber,
  });
  await sendWhatsAppUpdate(complaintId, body, stage === 'kit_ready' ? 'Satark_Complaint_Kit.pdf' : undefined);
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
 * driven by real events (the user's acknowledgement number, bank confirmation).
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
