import type { Indicator } from '@satark/shared';
import * as Crypto from 'expo-crypto';

export function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/**
 * Hash for the community blocklist. Raw numbers, UPI IDs and domains are never
 * stored or uploaded: phones compare hashes only. The backend re-keys these with
 * its HASH_SECRET (HMAC) before saving, so a leaked database cannot be reversed.
 */
export function hashIndicator(indicator: Indicator): Promise<string> {
  return sha256(`satark:${indicator.type}:${indicator.value.toLowerCase()}`);
}

/** Show enough of an indicator to recognise it, never the whole thing. */
export function maskIndicator({ type, value }: Indicator): string {
  if (type === 'phone') {
    const d = value.replace(/\D/g, '');
    return `+${d.slice(0, 4)} XXXXX ${d.slice(-3)}`;
  }
  if (type === 'upi') {
    const [local = '', handle = ''] = value.split('@');
    return `${local.slice(0, 2)}${'x'.repeat(Math.max(local.length - 4, 3))}${local.slice(-2)}@${handle}`;
  }
  return value.replace(/^([a-z0-9]{2})[a-z0-9-]*?([a-z0-9]{2})(\.)/i, '$1***$2$3');
}
