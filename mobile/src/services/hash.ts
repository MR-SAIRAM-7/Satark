import { indicatorKey, type Indicator } from '@satark/shared';
import * as Crypto from 'expo-crypto';

export { maskIndicator } from '@satark/shared';

export function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/**
 * Hash for the community blocklist. Raw numbers, UPI IDs and domains are never
 * stored or uploaded: phones compare hashes only. The format is `indicatorKey`
 * in @satark/shared, so the backend computes exactly the same hash.
 */
export function hashIndicator(indicator: Indicator): Promise<string> {
  return sha256(indicatorKey(indicator));
}
