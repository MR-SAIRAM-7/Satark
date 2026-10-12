/**
 * Hashing and encryption. Scammers' identifiers are kept only as hashes;
 * users' own phone numbers are encrypted (AES-256-GCM) because Satark needs
 * them to deliver the Complaint Kit on WhatsApp.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { indicatorKey, normalizeIndianMobile, type Indicator } from '@satark/shared';

import { env } from '../config/env';

export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

/** Same hash the phone computes (expo-crypto), so blocklists match across devices. */
export const indicatorHash = (indicator: Indicator) => sha256(indicatorKey(indicator));

const hmac = (value: string) => createHmac('sha256', env.HASH_SECRET).update(value).digest('hex');

/** Keyed hash of a user's phone number, for sign-in lookups. */
export const phoneHash = (phone: string) => hmac(`phone:${normalizePhone(phone)}`);

export function normalizePhone(phone: string): string {
  const indian = normalizeIndianMobile(phone);
  if (indian) return indian;
  return `+${phone.replace(/\D/g, '')}`;
}

const KEY = createHash('sha256').update(env.PHONE_ENC_KEY).digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string): string | null {
  try {
    const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Short-lived signature for file links (the local stand-in for S3 presigned URLs). */
export const signPath = (path: string, expires: number) => hmac(`file:${path}:${expires}`);

export function verifySignedPath(path: string, expires: number, signature: string): boolean {
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  const expected = Buffer.from(signPath(path, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const randomCode = (digits = 6) =>
  String(Number.parseInt(randomBytes(4).toString('hex'), 16) % 10 ** digits).padStart(digits, '0');
