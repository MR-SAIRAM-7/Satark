/**
 * Guardian alerts (F6) and escalation. A high-risk event reaches the family
 * within seconds: in-app (Socket.IO), push, and WhatsApp for critical events.
 * A critical alert nobody acknowledges is escalated: the guardian is reminded
 * and the cyber-cell dashboard sounds its alarm.
 */
import type { Types } from 'mongoose';

import { env } from '../config/env';
import { Alert, GuardianLink, User, type AlertDoc } from '../db/models';
import { emitToPolice, emitToUser, publish } from './realtime';
import { sendPush, sendWhatsApp } from './notify';

const MAX_ESCALATIONS = 2;

export interface AlertInput {
  elderId?: string | Types.ObjectId | null;
  kind: AlertDoc['kind'];
  severity: AlertDoc['severity'];
  title: string;
  summary: string;
  score?: number;
  scamType?: string;
  checkId?: Types.ObjectId;
  complaintId?: Types.ObjectId;
  locality?: string;
}

async function guardiansOf(elderId: string | Types.ObjectId) {
  const links = await GuardianLink.find({ elder: elderId }).lean();
  return User.find({ _id: { $in: links.map((l) => l.guardian) } }).lean();
}

async function notifyGuardians(alert: AlertDoc, elderName: string, reminder = false) {
  if (!alert.elder) return;
  const guardians = await guardiansOf(alert.elder);
  const prefix = reminder ? 'REMINDER - not yet acknowledged. ' : '';
  for (const guardian of guardians) {
    emitToUser(guardian._id, 'alert', alert.toJSON());
    await sendPush(guardian.pushTokens ?? [], { title: `${prefix}${alert.title}`, body: alert.summary ?? '', data: { alertId: alert.id } }, {
      audience: 'guardian',
      purpose: alert.kind,
      alert: alert._id,
    });
    // WhatsApp goes to family members; a Home Guardian phone gets the in-app and push alert only.
    if (alert.severity === 'critical' && guardian.role !== 'listener') {
      await sendWhatsApp(
        guardian.phoneEnc,
        `${prefix}Satark alert for ${elderName || 'your family member'}: ${alert.title}. ${alert.summary} Please call them now. Reply in the Satark app to acknowledge.`,
        { encrypted: true, audience: 'guardian', purpose: alert.kind, alert: alert._id },
      );
    }
  }
}

export async function raiseAlert(input: AlertInput): Promise<AlertDoc> {
  const alert = await Alert.create({
    elder: input.elderId ?? undefined,
    kind: input.kind,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    score: input.score,
    scamType: input.scamType ?? 'unknown',
    check: input.checkId,
    complaint: input.complaintId,
    locality: input.locality,
  });
  const elder = input.elderId ? await User.findById(input.elderId).lean() : null;
  if (elder) emitToUser(elder._id, 'alert', alert.toJSON());
  await notifyGuardians(alert, elder?.name ?? '');
  if (alert.severity !== 'info') {
    await publish({
      type: 'alert',
      severity: alert.severity,
      title: alert.title ?? 'Alert',
      detail: alert.summary ?? undefined,
      scamType: alert.scamType,
      locality: input.locality ?? elder?.locality,
      ref: alert.id,
    });
  }
  return alert;
}

export async function acknowledge(alertId: string, by: string): Promise<AlertDoc | null> {
  const alert = await Alert.findByIdAndUpdate(alertId, { ackedAt: new Date(), ackedBy: by }, { returnDocument: 'after' });
  if (alert) emitToPolice('alert:ack', { id: alert.id, ackedBy: by });
  return alert;
}

/** Job: re-notify and escalate critical alerts nobody has acknowledged. */
export async function escalateUnacknowledged(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - env.ESCALATE_AFTER_MIN * 60_000);
  const stale = await Alert.find({
    severity: 'critical',
    ackedAt: null,
    escalations: { $lt: MAX_ESCALATIONS },
    createdAt: { $lte: cutoff },
    $or: [{ lastEscalatedAt: null }, { lastEscalatedAt: { $lte: cutoff } }],
  }).limit(50);

  for (const alert of stale) {
    alert.escalations += 1;
    alert.lastEscalatedAt = now;
    await alert.save();
    const elder = alert.elder ? await User.findById(alert.elder).lean() : null;
    await notifyGuardians(alert, elder?.name ?? '', true);
    await publish({
      type: 'escalation',
      severity: 'critical',
      title: `Unacknowledged for ${Math.round((now.getTime() - alert.createdAt.getTime()) / 60_000)} min: ${alert.title}`,
      detail: `Escalation ${alert.escalations} of ${MAX_ESCALATIONS}. ${elder?.name ? `${elder.name}, ` : ''}${alert.locality ?? elder?.locality ?? ''}`.trim(),
      scamType: alert.scamType,
      locality: alert.locality ?? elder?.locality,
      ref: alert.id,
    });
  }
  return stale.length;
}
