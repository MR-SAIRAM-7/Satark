import type { Indicator, ScamType } from '@satark/shared';

import { SAMPLES } from '@/data/samples';
import { syncNativeBlocklist } from '@/features/detection/community';
import { processIncoming } from '@/features/detection/pipeline';
import { hashIndicator, maskIndicator } from '@/services/hash';
import { useIntel } from '@/store/activity';
import type { CommunityIoc } from '@/types';

import { KNOWN_SCAM_CALLER } from './scenarios';

const HOUR = 60 * 60 * 1000;

/**
 * Community blocklist the phone ships with in demo mode, standing in for
 * `/v1/iocs/sync`. Values are placeholders; only their hashes are stored.
 */
const COMMUNITY_SEED: (Indicator & { reports: number; scamType: ScamType; hoursAgo: number })[] = [
  { type: 'phone', value: KNOWN_SCAM_CALLER.replace(/\s/g, ''), reports: 37, scamType: 'digital_arrest', hoursAgo: 5 },
  { type: 'phone', value: '+919700011223', reports: 12, scamType: 'malware_apk', hoursAgo: 20 },
  { type: 'phone', value: '+919640055667', reports: 8, scamType: 'investment', hoursAgo: 30 },
  { type: 'upi', value: 'arjun.trader88@ybl', reports: 8, scamType: 'investment', hoursAgo: 30 },
  { type: 'upi', value: 'electricity.officer21@okaxis', reports: 19, scamType: 'electricity', hoursAgo: 2 },
  { type: 'domain', value: 'sbi-yono-kyc.xyz', reports: 24, scamType: 'kyc_bank', hoursAgo: 9 },
  { type: 'domain', value: 'hdfcbnak-rewards.top', reports: 6, scamType: 'phishing_link', hoursAgo: 48 },
  { type: 'domain', value: 'indiapost-redelivery.live', reports: 15, scamType: 'courier', hoursAgo: 14 },
];

export async function seedCommunityIntel(): Promise<void> {
  const now = Date.now();
  const iocs: CommunityIoc[] = await Promise.all(
    COMMUNITY_SEED.map(async ({ reports, scamType, hoursAgo, ...indicator }) => ({
      hash: await hashIndicator(indicator),
      type: indicator.type,
      masked: maskIndicator(indicator),
      reportCount: reports,
      status: 'confirmed' as const,
      scamType,
      firstSeen: now - (hoursAgo + 24) * HOUR,
      lastSeen: now - hoursAgo * HOUR,
      origin: 'community' as const,
    })),
  );
  useIntel.getState().merge(iocs, now);
  syncNativeBlocklist();
}

/** Fill Activity with a believable few days, by running samples through the real engine. */
export async function loadSampleHistory(): Promise<void> {
  const now = Date.now();
  const history: [string, number][] = [
    ['genuine-otp', 49],
    ['trading', 31],
    ['challan-apk', 26],
    ['genuine-bill', 22],
    ['electricity', 7],
    ['kyc-link', 3],
  ];
  for (const [id, hoursAgo] of history) {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) continue;
    await processIncoming(
      { source: sample.source, sender: sample.sender, text: sample.text, receivedAt: now - hoursAgo * HOUR },
      { silent: true, userInitiated: !sample.isScam },
    );
  }
}
