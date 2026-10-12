/**
 * Server-side link enrichment for rules R5 (domain registered < 30 days ago,
 * via RDAP) and R6 (Google Safe Browsing). Passive lookups only: Satark never
 * opens a suspicious site. Results are cached; a slow lookup is skipped rather
 * than allowed to delay a warning.
 */
import type { LinkFinding } from '@satark/shared';
import { LRUCache } from 'lru-cache';

import { env, features } from '../config/env';
import { fetchJson, postJson } from '../lib/http';

const ageCache = new LRUCache<string, number | -1>({ max: 5000, ttl: 24 * 60 * 60 * 1000 });

interface RdapResponse {
  events?: { eventAction?: string; eventDate?: string }[];
}

async function lookupDomainAge(domain: string): Promise<number | null> {
  const cached = ageCache.get(domain);
  if (cached !== undefined) return cached < 0 ? null : cached;
  try {
    const data = await fetchJson<RdapResponse>(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { timeoutMs: 1500 });
    const registered = data.events?.find((e) => e.eventAction === 'registration')?.eventDate;
    const days = registered ? Math.floor((Date.now() - Date.parse(registered)) / 86_400_000) : -1;
    ageCache.set(domain, days);
    return days < 0 ? null : days;
  } catch {
    ageCache.set(domain, -1, { ttl: 10 * 60 * 1000 });
    return null;
  }
}

async function safeBrowsing(urls: string[]): Promise<string[]> {
  if (!features.safeBrowsing || urls.length === 0) return [];
  try {
    const data = await postJson<{ matches?: { threat?: { url?: string } }[] }>(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_API_KEY}`,
      {
        client: { clientId: 'satark', clientVersion: '0.1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: urls.map((url) => ({ url })),
        },
      },
      {},
      1500,
    );
    return (data.matches ?? []).map((m) => m.threat?.url ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

export interface Enrichment {
  domainAgeDays: Record<string, number>;
  safeBrowsingHits: string[];
}

export async function enrichLinks(links: LinkFinding[]): Promise<Enrichment | null> {
  const unofficial = links.filter((l) => !l.official).slice(0, 5);
  if (!env.ENRICH_LINKS || unofficial.length === 0) return null;
  const [ages, hits] = await Promise.all([
    Promise.all(unofficial.map(async (l) => [l.domain, await lookupDomainAge(l.domain)] as const)),
    safeBrowsing(unofficial.map((l) => l.url)),
  ]);
  const domainAgeDays = Object.fromEntries(ages.filter((a): a is readonly [string, number] => a[1] !== null));
  return { domainAgeDays, safeBrowsingHits: hits };
}
