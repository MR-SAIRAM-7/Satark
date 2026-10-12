/**
 * Community-intelligence identity of a scammer's number, UPI ID or domain.
 *
 * Phones and the server must produce the same hash for the same indicator, or
 * a number reported on one phone would never be blocked on another. The format
 * lives here; each side hashes `indicatorKey()` with its own SHA-256
 * (expo-crypto on the phone, node:crypto on the server).
 */
import type { Indicator } from './types';

/** The exact string that is SHA-256 hashed. Never change it without migrating stored hashes. */
export function indicatorKey({ type, value }: Indicator): string {
  return `satark:${type}:${value.toLowerCase()}`;
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
