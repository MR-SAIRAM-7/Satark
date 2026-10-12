import type { Indicator, ScamType } from '@satark/shared';

import { api } from '@/services/api';
import { hashIndicator, maskIndicator } from '@/services/hash';
import { SatarkNative } from '@/services/native';
import { useIntel } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import type { CommunityIoc } from '@/types';

/** Layer 5 score for a hit: three or more independent reports mark an indicator confirmed. */
const SCORE = { confirmed: 95, suspected: 60 } as const;
const CONFIRM_AT = 3;

export interface CommunityLookup {
  score: number;
  hits: CommunityIoc[];
}

/** Layer 5: match hashed indicators against the on-phone cache. Works offline. */
export async function lookupCommunity(indicators: Indicator[]): Promise<CommunityLookup> {
  const { iocs } = useIntel.getState();
  const hits: CommunityIoc[] = [];
  for (const indicator of indicators) {
    const hit = iocs[await hashIndicator(indicator)];
    if (hit) hits.push(hit);
  }
  const score = hits.reduce((max, h) => Math.max(max, SCORE[h.status]), 0);
  return { score, hits };
}

/** Keep the native call-screening cache in step with the store, for pre-ring blocking. */
export function syncNativeBlocklist(): void {
  const phones = Object.values(useIntel.getState().iocs).filter((i) => i.type === 'phone');
  SatarkNative.syncReportedHashes(phones.map((i) => i.hash));
}

/** Pull new community hashes from the server (no-op for the on-device engine). */
export async function syncCommunity(): Promise<void> {
  const { lastSyncAt, merge } = useIntel.getState();
  try {
    const fresh = await api.syncIocs(lastSyncAt);
    merge(fresh, Date.now());
  } catch {
    // Offline: the cached blocklist keeps working.
  }
  syncNativeBlocklist();
}

/**
 * Confirm a scam (F13). Every indicator is hashed, added to this phone's
 * blocklist immediately, and shared so other phones block it within a minute.
 */
export async function reportIndicators(
  indicators: Indicator[],
  scamType: ScamType,
  checkId: string,
): Promise<number> {
  const intel = useIntel.getState();
  const now = Date.now();
  const payload = [];

  for (const indicator of indicators) {
    const hash = await hashIndicator(indicator);
    const existing = intel.iocs[hash];
    const reportCount = (existing?.reportCount ?? 0) + 1;
    const ioc: CommunityIoc = {
      hash,
      type: indicator.type,
      masked: maskIndicator(indicator),
      reportCount,
      status: reportCount >= CONFIRM_AT ? 'confirmed' : (existing?.status ?? 'suspected'),
      scamType,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
      origin: existing?.origin ?? 'local',
    };
    intel.upsert(ioc);
    payload.push({ type: ioc.type, hash, masked: ioc.masked });
  }

  useChecks.getState().patch(checkId, { reported: true });
  syncNativeBlocklist();
  api
    .report({ checkId, scamType, locality: useSettings.getState().elder.locality, indicators: payload })
    .catch(() => undefined); // queued server-side retry comes with the backend
  return indicators.length;
}
