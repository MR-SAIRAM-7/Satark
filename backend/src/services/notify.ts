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
import twilio from 'twilio';

import { env, features } from '../config/env';
import { Message } from '../db/models';
import { decrypt } from '../lib/crypto';
import { logger } from '../lib/logger';
import { emitToPolice } from './realtime';

export const twilioClient = features.whatsapp || features.otp ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) : null;
const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

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
  const number = to ? (encrypted ? decrypt(to) : to) : null;
  const toMasked = number ? maskPhone(number) : 'no number on file';

  if (!number) {
    await record('whatsapp', toMasked, body, 'skipped', rest, { mediaUrl });
    return 'skipped';
  }
  if (!features.whatsapp || !twilioClient) {
    await record('whatsapp', toMasked, body, 'demo', rest, { mediaUrl });
    return 'demo';
  }
  try {
    const sent = await twilioClient.messages.create({
      from: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${number}`,
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });
    await record('whatsapp', toMasked, body, 'sent', rest, { mediaUrl, providerId: sent.sid });
    return 'sent';
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'WhatsApp send failed');
    await record('whatsapp', toMasked, body, 'failed', rest, { mediaUrl, error: (err as Error).message });
    return 'failed';
  }
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
