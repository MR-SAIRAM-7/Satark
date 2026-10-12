/**
 * Twilio specifics, kept in one place: the client, the WhatsApp sender, what
 * Twilio can and cannot reach, the Sandbox send rate, webhook signatures and
 * plain-language explanations of the delivery errors a demo is likely to hit.
 */
import type { Request } from 'express';
import twilio from 'twilio';

import { env, features } from '../config/env';
import { HttpError } from './errors';

export const twilioClient =
  features.whatsapp || features.otp ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) : null;

/** The shared number every Twilio WhatsApp Sandbox sends from. */
export const SANDBOX_NUMBER = '+14155238886';

/** Sender in E.164, whether the .env value was written as "+1415..." or "whatsapp:+1415...". */
export const whatsappFrom = (env.TWILIO_WHATSAPP_FROM ?? '').replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
export const usingSandbox = whatsappFrom === SANDBOX_NUMBER;

/** Twilio fetches media and calls webhooks from the internet: localhost and private addresses do not work. */
export function isPublicUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') return false;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(hostname) && hostname.includes('.');
  } catch {
    return false;
  }
}

/** Public base URL of this API, or null while it is only reachable on this machine. */
export const publicBase = isPublicUrl(env.PUBLIC_BASE_URL) ? env.PUBLIC_BASE_URL.replace(/\/$/, '') : null;

/** The two URLs to paste into the Twilio console (null until PUBLIC_BASE_URL is public). */
export const webhooks = {
  inbound: publicBase ? `${publicBase}/v1/whatsapp/inbound` : null,
  status: publicBase ? `${publicBase}/v1/whatsapp/status` : null,
};

/**
 * The Sandbox number may send one message every three seconds. Sends are
 * queued so a burst (elder + guardian, or several stage updates) is spaced out
 * instead of being rejected with error 63018.
 */
const SANDBOX_GAP_MS = 3100;
let queue: Promise<unknown> = Promise.resolve();
let lastSentAt = 0;

export function paced<T>(send: () => Promise<T>): Promise<T> {
  if (!usingSandbox || env.NODE_ENV === 'test') return send();
  const run = queue.then(async () => {
    const wait = lastSentAt + SANDBOX_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      return await send();
    } finally {
      lastSentAt = Date.now();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Reject anything that did not come from Twilio. Skipped only when no auth token is configured (demo mode). */
export function verifyTwilioSignature(req: Request): void {
  if (!env.TWILIO_AUTH_TOKEN) return;
  // Twilio signs the exact URL it called, so PUBLIC_BASE_URL must match what is set in the console.
  const url = `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}${req.originalUrl}`;
  const signature = req.header('x-twilio-signature') ?? '';
  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body ?? {})) {
    throw new HttpError(403, 'Invalid Twilio signature');
  }
}

/** What went wrong, in words the person running the demo can act on. */
const ERRORS: Record<number, string> = {
  20003: 'Twilio rejected the credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
  21211: 'The recipient number is not a valid phone number.',
  21610: 'The recipient replied STOP. They must send START (or rejoin the Sandbox) to get messages again.',
  63003: 'The recipient number is not on WhatsApp.',
  63005: 'WhatsApp rejected the content (often an attachment it could not use).',
  63007: 'Twilio has no WhatsApp sender for TWILIO_WHATSAPP_FROM. For the Sandbox it must be +14155238886.',
  63015: 'The recipient has not joined the Sandbox. They must send "join <your code>" to +1 415 523 8886 on WhatsApp.',
  63016: 'Outside the 24-hour window. The recipient must message the Sandbox number first (any text, e.g. "Hi").',
  63018: 'The sender hit its rate limit. The Sandbox allows one message every three seconds.',
  63019: 'Twilio could not download the attachment. The file link must be public (set PUBLIC_BASE_URL or use S3).',
  63024: 'The recipient is not a valid WhatsApp user.',
  63038: 'The account reached its daily message limit (trial accounts are capped).',
};

export function explainTwilioError(code: number | string | undefined | null, fallback?: string | null): string {
  const numeric = Number(code);
  const known = Number.isFinite(numeric) ? ERRORS[numeric] : undefined;
  if (known) return `${known} (Twilio error ${numeric})`;
  if (fallback) return Number.isFinite(numeric) && numeric > 0 ? `${fallback} (Twilio error ${numeric})` : fallback;
  return Number.isFinite(numeric) && numeric > 0 ? `Twilio error ${numeric}` : 'Delivery failed';
}
