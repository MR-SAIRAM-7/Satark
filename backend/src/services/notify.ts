/**
 * Outbound channels: WhatsApp (Twilio) and push (Expo push service, which
 * delivers through FCM on Android). Every message, sent or not, is recorded in
 * the outbox so the dashboard shows exactly what Satark told whom and when.
 *
 * Without Twilio credentials, messages are recorded with status "demo" and
 * nothing leaves the server: the hackathon rule that no real service is
 * contacted during testing holds by default.
 */
import { maskPhone } from '@satark/shared';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import type { Types } from 'mongoose';

import { env, features } from '../config/env';
import { Message } from '../db/models';
import { decrypt, normalizePhone } from '../lib/crypto';
import { logger } from '../lib/logger';
import { explainTwilioError, isPublicUrl, paced, twilioClient, webhooks, whatsappFrom } from '../lib/twilio';
import { DEMO_ELDERS, DEMO_POLICE } from '../seed/data';
import { emitToPolice } from './realtime';

export { twilioClient };
const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

/**
 * The seeded demo people's numbers are invented, and an invented number may
 * still belong to a stranger. Messages to them are recorded, never sent.
 */
const SEEDED_NUMBERS = new Set(
  [...DEMO_POLICE.map((p) => p.phone), ...DEMO_ELDERS.flatMap((e) => [e.phone, e.guardian?.phone])].filter((p): p is string => Boolean(p)),
);

/** What `sendWhatsApp` reports back. "delivered" and "read" arrive later, on the status webhook. */
export type DeliveryStatus = 'sent' | 'demo' | 'failed' | 'skipped';

interface Meta {
  audience?: 'elder' | 'guardian' | 'police' | 'bank' | 'public';
  purpose?: string;
  complaint?: Types.ObjectId | string;
  alert?: Types.ObjectId | string;
}

async function record(channel: 'whatsapp' | 'push' | 'email', toMasked: string, body: string, status: DeliveryStatus, meta: Meta, extra: object = {}) {
  const message = await Message.create({ channel, toMasked, body, status, ...meta, ...extra });
  emitToPolice('outbox', message.toJSON());
  return message;
}

/** `to` is an E.164 number, or an encrypted one (phoneEnc) when `encrypted` is set. */
export async function sendWhatsApp(
  to: string | null | undefined,
  body: string,
  meta: Meta & { mediaUrl?: string; encrypted?: boolean } = {},
): Promise<DeliveryStatus> {
  const { mediaUrl, encrypted, ...rest } = meta;
  const raw = to ? (encrypted ? decrypt(to) : to) : null;
  // Twilio needs E.164 ("+919876543210"); people type "98765 43210".
  const number = raw ? normalizePhone(raw) : null;
  const toMasked = number ? maskPhone(number) : 'no number on file';

  if (!number || number.length < 9) {
    await record('whatsapp', toMasked, body, 'skipped', rest, { mediaUrl });
    return 'skipped';
  }
  if (SEEDED_NUMBERS.has(number)) {
    await record('whatsapp', toMasked, body, 'demo', rest, { mediaUrl, error: 'Seeded demo person (invented number): recorded, not sent.' });
    return 'demo';
  }
  const client = twilioClient;
  if (!features.whatsapp || !client) {
    await record('whatsapp', toMasked, body, 'demo', rest, { mediaUrl });
    return 'demo';
  }

  // Twilio downloads attachments itself. A link only this machine can open would fail the
  // whole message (error 63019), so the text goes without it and the outbox says why.
  const attachable = isPublicUrl(mediaUrl);
  const note = mediaUrl && !attachable ? 'Sent without the PDF: its link is not public. Set PUBLIC_BASE_URL or S3.' : undefined;

  try {
    const sent = await paced(() =>
      client.messages.create({
        from: `whatsapp:${whatsappFrom}`,
        to: `whatsapp:${number}`,
        body,
        ...(attachable && mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
        // Delivery receipts (delivered / read / failed) come back on this webhook.
        ...(webhooks.status ? { statusCallback: webhooks.status } : {}),
      }),
    );
    await record('whatsapp', toMasked, body, 'sent', rest, { mediaUrl, providerId: sent.sid, error: note });
    return 'sent';
  } catch (err) {
    const { code, message } = err as { code?: number; message?: string };
    const reason = explainTwilioError(code, message);
    logger.warn({ code, reason }, 'WhatsApp send failed');
    await record('whatsapp', toMasked, body, 'failed', rest, { mediaUrl, error: reason, errorCode: code });
    return 'failed';
  }
}

/** Twilio's status webhook: move a sent message on to delivered, read or failed. */
export async function recordDeliveryStatus(update: {
  sid: string;
  status: string;
  errorCode?: string | number;
  channelMessage?: string;
}): Promise<boolean> {
  const message = await Message.findOne({ providerId: update.sid });
  if (!message) return false;

  const incoming = update.status.toLowerCase();
  const failed = incoming === 'failed' || incoming === 'undelivered';
  // Receipts can arrive out of order: never step back from read to delivered, or from either to sent.
  const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3 };
  const next = failed ? 'failed' : incoming in rank ? incoming : null;
  if (!next) return true; // queued / sending: nothing to show yet
  if (!failed && (rank[message.status] ?? 0) >= (rank[next] ?? 0)) return true;

  message.status = next as typeof message.status;
  if (failed) {
    message.error = explainTwilioError(update.errorCode, update.channelMessage);
    message.errorCode = Number(update.errorCode) || undefined;
  }
  await message.save();
  emitToPolice('outbox', message.toJSON());
  return true;
}

export async function sendPush(
  tokens: string[],
  notification: { title: string; body: string; data?: Record<string, unknown> },
  meta: Meta = {},
): Promise<DeliveryStatus> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  const summary = `${notification.title}: ${notification.body}`;
  if (valid.length === 0) {
    await record('push', `${meta.audience ?? 'user'} app`, summary, 'demo', meta);
    return 'demo';
  }
  const messages: ExpoPushMessage[] = valid.map((to) => ({ to, sound: 'default', priority: 'high', channelId: 'alerts', ...notification }));
  try {
    for (const chunk of expo.chunkPushNotifications(messages)) await expo.sendPushNotificationsAsync(chunk);
    await record('push', `${valid.length} device(s)`, summary, 'sent', meta);
    return 'sent';
  } catch (err) {
    await record('push', `${valid.length} device(s)`, summary, 'failed', meta, { error: (err as Error).message });
    return 'failed';
  }
}

/** Letters to banks' nodal officers are drafted and recorded; a real deployment would email them. */
export const recordEmail = (toMasked: string, body: string, meta: Meta) => record('email', toMasked, body, 'demo', meta);
