/**
 * STIX 2.1 export (F14): confirmed indicators and active campaigns as a bundle
 * cyber cells and CERT teams can import. Domains use the standard
 * domain-name pattern when the server knows the value; phone numbers and UPI
 * IDs have no STIX cyber-observable, so they use a custom x-satark-indicator
 * object carrying the SHA-256 hash phones match on.
 */
import { SCAM_TYPES, type ScamType } from '@satark/shared';

import { Campaign, Ioc } from '../db/models';
import { sha256 } from '../lib/crypto';

/** Deterministic RFC 4122 v4-format UUID from any string, so re-exports keep the same ids. */
const uuidFrom = (seed: string) => {
  const h = sha256(seed);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const IDENTITY_ID = `identity--${uuidFrom('satark-identity')}`;
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');

export async function buildStixBundle() {
  const [iocs, campaigns] = await Promise.all([
    Ioc.find({ status: 'confirmed' }).sort({ reportCount: -1 }).limit(2000).lean(),
    Campaign.find({ active: true }).lean(),
  ]);
  const created = iso(new Date('2026-10-12T00:00:00Z'));

  const identity = {
    type: 'identity',
    spec_version: '2.1',
    id: IDENTITY_ID,
    created,
    modified: created,
    name: 'Satark Community Threat Intelligence',
    identity_class: 'organization',
    description: 'Scam indicators reported by Satark users (senior citizens and families) in Hyderabad.',
  };

  const campaignObjects = campaigns.map((c) => ({
    type: 'campaign',
    spec_version: '2.1',
    id: `campaign--${uuidFrom(`campaign:${c.key}`)}`,
    created: iso(c.createdAt),
    modified: iso(c.updatedAt),
    created_by_ref: IDENTITY_ID,
    name: c.label,
    description: `${c.reportCount} reports across ${c.localities.join(', ') || 'Hyderabad'}. Example (masked): ${c.sampleText ?? '-'}`,
    first_seen: c.firstSeen ? iso(c.firstSeen) : undefined,
    last_seen: c.lastSeen ? iso(c.lastSeen) : undefined,
    labels: [c.scamType ?? 'unknown'],
  }));
  const campaignIds = new Map(campaigns.map((c, i) => [String(c._id), campaignObjects[i]!.id]));

  const indicators = iocs.map((ioc) => {
    const pattern =
      ioc.type === 'domain' && ioc.value
        ? `[domain-name:value = '${ioc.value.replace(/'/g, "\\'")}']`
        : `[x-satark-indicator:hash = '${ioc.hash}' AND x-satark-indicator:kind = '${ioc.type}']`;
    return {
      type: 'indicator',
      spec_version: '2.1',
      id: `indicator--${uuidFrom(`ioc:${ioc.type}:${ioc.hash}`)}`,
      created: iso(ioc.firstSeen),
      modified: iso(ioc.updatedAt),
      created_by_ref: IDENTITY_ID,
      name: `Scam ${ioc.type}: ${ioc.masked}`,
      description: `${SCAM_TYPES[ioc.scamType as ScamType]?.label.en ?? 'Scam'} indicator, ${ioc.reportCount} independent reports.`,
      indicator_types: ['malicious-activity'],
      pattern,
      pattern_type: 'stix',
      valid_from: iso(ioc.firstSeen),
      confidence: Math.min(100, 50 + ioc.reportCount * 5),
      labels: [ioc.scamType],
      x_satark_masked: ioc.masked,
      x_satark_report_count: ioc.reportCount,
    };
  });

  const relationships = iocs.flatMap((ioc, i) => {
    const campaignId = ioc.campaign ? campaignIds.get(String(ioc.campaign)) : undefined;
    if (!campaignId) return [];
    return [
      {
        type: 'relationship',
        spec_version: '2.1',
        id: `relationship--${uuidFrom(`rel:${indicators[i]!.id}:${campaignId}`)}`,
        created,
        modified: created,
        relationship_type: 'indicates',
        source_ref: indicators[i]!.id,
        target_ref: campaignId,
      },
    ];
  });

  return {
    type: 'bundle',
    id: `bundle--${uuidFrom(`bundle:${Date.now()}`)}`,
    objects: [identity, ...campaignObjects, ...indicators, ...relationships],
  };
}
