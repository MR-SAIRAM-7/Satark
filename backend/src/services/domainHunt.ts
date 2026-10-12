/**
 * Phishing domain hunter (F19): Certificate Transparency logs (crt.sh) list
 * every new TLS certificate, so look-alike bank domains show up before the
 * first SMS goes out. Passive lookups only; nothing is ever visited.
 */
import { analyzeLink, brandById } from '@satark/shared';
import { LRUCache } from 'lru-cache';

import { fetchJson } from '../lib/http';

export interface SuspectDomain {
  domain: string;
  imitates: string | null;
  risk: string[];
  firstSeen: string | null;
  issuer: string | null;
}

export interface HuntResult {
  brand: string;
  source: 'crt.sh' | 'sample';
  note?: string;
  results: SuspectDomain[];
}

const cache = new LRUCache<string, HuntResult>({ max: 50, ttl: 6 * 60 * 60 * 1000 });
const BAIT = /(kyc|verify|update|reward|login|secure|support|refund|bonus|yono|netbank|alert|block)/;

function assess(host: string, brandId: string): SuspectDomain | null {
  const link = analyzeLink(`https://${host}`);
  if (link.official) return null;
  const risk = [
    link.lookalikeOf?.id === brandId ? 'look-alike spelling' : null,
    link.riskyTld ? 'high-risk TLD' : null,
    BAIT.test(link.domain) ? 'bait word (kyc, reward, verify...)' : null,
    link.oddHost ? 'punycode or IP host' : null,
  ].filter((r): r is string => r !== null);
  if (risk.length === 0) return null;
  return { domain: link.domain, imitates: link.lookalikeOf?.name ?? null, risk, firstSeen: null, issuer: null };
}

export async function huntDomains(brandId = 'sbi'): Promise<HuntResult> {
  const brand = brandById(brandId) ?? brandById('sbi')!;
  const cached = cache.get(brand.id);
  if (cached) return cached;
  const keyword = brand.keys[0] ?? brand.id;

  let result: HuntResult;
  try {
    const entries = await fetchJson<{ name_value: string; not_before: string; issuer_name: string }[]>(
      `https://crt.sh/?q=${encodeURIComponent(`%${keyword}%`)}&output=json&exclude=expired`,
      { timeoutMs: 8000 },
    );
    const seen = new Map<string, SuspectDomain>();
    for (const entry of entries.slice(0, 3000)) {
      for (const host of entry.name_value.split('\n').map((h) => h.replace(/^\*\./, '').toLowerCase())) {
        const finding = assess(host, brand.id);
        if (finding && !seen.has(finding.domain)) {
          seen.set(finding.domain, { ...finding, firstSeen: entry.not_before, issuer: entry.issuer_name.match(/O=([^,]+)/)?.[1] ?? null });
        }
      }
    }
    result = { brand: brand.name, source: 'crt.sh', results: [...seen.values()].slice(0, 50) };
  } catch {
    // crt.sh is often slow. Show how the hunter scores domains on generated examples, labelled as such.
    const samples = [`${keyword}-kyc-update.top`, `${keyword}-rewards.online`, `${keyword}bank-verify.xyz`, `secure-${keyword}-login.click`, `${keyword}-yono-kyc.xyz`];
    result = {
      brand: brand.name,
      source: 'sample',
      note: 'crt.sh did not answer in time. These are generated examples showing how the hunter scores look-alike domains.',
      results: samples.map((h) => assess(h, brand.id)).filter((r): r is SuspectDomain => r !== null),
    };
  }
  cache.set(brand.id, result, { ttl: result.source === 'sample' ? 5 * 60 * 1000 : undefined });
  return result;
}
