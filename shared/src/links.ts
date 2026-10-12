/**
 * Link checker (rules R4, R9, R14). Passive string analysis only: Satark never
 * opens or scans a suspicious site. Domain age (R5) and Safe Browsing (R6) are
 * added by the server.
 */
import rules from './rules.json';
import { levenshtein } from './match';

export interface Brand {
  id: string;
  name: string;
  kind: string;
  names: string[];
  keys: string[];
  domains: string[];
}

export interface LinkFinding {
  url: string;
  host: string;
  /** Registrable domain, e.g. "sbi-kyc.xyz". */
  domain: string;
  /** The link really belongs to this brand or to a restricted government/bank suffix. */
  official: boolean;
  /** The brand this link imitates without being its real site. */
  lookalikeOf: Brand | null;
  shortener: boolean;
  riskyTld: boolean;
  /** Raw IP address, punycode or plain-http host. */
  oddHost: boolean;
  apk: boolean;
}

const BRANDS = rules.brands as Brand[];
const { shorteners, riskyTlds, trustedSuffixes, multiPartTlds, knownTlds } = rules.links;
const TLDS = new Set([...knownTlds, ...riskyTlds].filter((t) => t !== 'apk'));

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"'`]+|(?<![@\w.\-/])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,12}(?:\/[^\s<>"'`]*)?/gi;
const APK_RE = /[\w\-()%.]+\.apk\b/i;
const IP_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function hostOf(url: string): string {
  return url
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^[^/@]*@/, '') // user-info trick: https://sbi.co.in@evil.xyz
    .split(/[/?#]/)[0]!
    .replace(/:\d+$/, '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

export function registrableDomain(host: string): string {
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join('.');
  return labels.slice(multiPartTlds.includes(lastTwo) ? -3 : -2).join('.');
}

function tldOf(host: string): string {
  const lastTwo = host.split('.').slice(-2).join('.');
  return multiPartTlds.includes(lastTwo) ? lastTwo : (host.split('.').pop() ?? '');
}

function isOfficial(host: string): boolean {
  if (trustedSuffixes.some((s) => host === s || host.endsWith(`.${s}`))) return true;
  return BRANDS.some((b) => b.domains.some((d) => host === d || host.endsWith(`.${d}`)));
}

function findLookalike(host: string): Brand | null {
  const domain = registrableDomain(host);
  const tld = tldOf(host);
  const namePart = host.slice(0, host.length - tld.length - 1);
  const tokens = namePart.split(/[.\-_]/).filter(Boolean);
  const label = domain.slice(0, domain.length - tldOf(domain).length - 1);

  for (const brand of BRANDS) {
    // Official domain used as a sub-domain of something else: sbi.co.in.secure-login.xyz
    if (brand.domains.some((d) => host.includes(d))) return brand;

    for (const key of brand.keys) {
      const hit =
        key.length <= 4
          ? tokens.some(
              (t) => t === key || ((t.startsWith(key) || t.endsWith(key)) && t.length <= key.length + 8),
            )
          : tokens.some((t) => t.includes(key));
      if (hit) return brand;
    }

    // One or two typos away from the real name: hdfcbnak.com, icicibamk.in
    for (const official of brand.domains) {
      const officialLabel = official.split('.')[0] ?? '';
      if (officialLabel.length < 6 || Math.abs(officialLabel.length - label.length) > 2) continue;
      const distance = levenshtein(label, officialLabel);
      if (distance > 0 && distance <= 2) return brand;
    }
  }
  return null;
}

export function analyzeLink(url: string): LinkFinding {
  const trimmed = url.replace(/[.,;:!?)\]}'"]+$/, '');
  const host = hostOf(trimmed);
  const official = isOfficial(host);
  const domain = registrableDomain(host);
  const tld = host.split('.').pop() ?? '';
  return {
    url: trimmed,
    host,
    domain,
    official,
    lookalikeOf: official ? null : findLookalike(host),
    shortener: shorteners.includes(domain),
    riskyTld: !official && riskyTlds.includes(tld),
    oddHost: IP_RE.test(host) || host.includes('xn--') || /^http:\/\//i.test(trimmed),
    apk: APK_RE.test(trimmed),
  };
}

export function extractLinks(text: string): LinkFinding[] {
  const seen = new Set<string>();
  const out: LinkFinding[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0];
    const explicit = /^(?:https?:\/\/|www\.)/i.test(raw);
    const finding = analyzeLink(raw);
    if (!finding.host.includes('.')) continue;
    // Bare words like "Rs.500" or "Dr.Rao" are not links: require a real TLD.
    if (!explicit && !TLDS.has(finding.host.split('.').pop() ?? '')) continue;
    if (seen.has(finding.url)) continue;
    seen.add(finding.url);
    out.push(finding);
  }
  return out;
}

/** An APK file name or link anywhere in the text (rule R9). */
export function findApk(text: string): string | null {
  return APK_RE.exec(text)?.[0] ?? null;
}

/** The first brand named in the text, preferring banks and government bodies. */
export function findBrand(norm: string, matches: (phrases: readonly string[]) => boolean): Brand | null {
  return BRANDS.find((b) => matches(b.names)) ?? null;
}

export function brandById(id: string): Brand | undefined {
  return BRANDS.find((b) => b.id === id);
}
