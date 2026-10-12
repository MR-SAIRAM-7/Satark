/**
 * Layer 2 - India rules. Deterministic red flags built on how Indian banks,
 * telecom operators and UPI actually work. Data lives in rules.json so the
 * phone and the server can never disagree; only the predicates live here.
 */
import rulesData from './rules.json';
import type { CleanResult } from './clean';
import type { SenderInfo } from './sender';
import type { Signals } from './signals';
import type { AnalysisContext, Localized, RuleHit, Source } from './types';

export interface RuleDefinition {
  id: string;
  points: number;
  title: Localized;
  why: Localized;
}

export const RULES = rulesData.rules as RuleDefinition[];
export const RULES_VERSION = rulesData.version;
export const THRESHOLDS = rulesData.thresholds;

const POINTS = new Map(RULES.map((r) => [r.id, r.points]));

/** Rules that are damning on their own, whoever the sender is. */
export const HARD_RULES = new Set(['R4', 'R6', 'R7', 'R9', 'R10', 'R15']);

export function getRule(id: string): RuleDefinition | undefined {
  return RULES.find((r) => r.id === id);
}

export interface RuleInput {
  cleaned: CleanResult;
  signals: Signals;
  sender: SenderInfo;
  source: Source;
  context: AnalysisContext;
}

export function evaluateRules({ cleaned, signals: s, sender, source, context }: RuleInput): RuleHit[] {
  const hits: RuleHit[] = [];
  const add = (id: string, match?: string, points = POINTS.get(id) ?? 0) =>
    hits.push({ id, points, ...(match ? { match } : {}) });

  const registered = sender.kind === 'header';
  const isCall = source === 'call' || source === 'transcript';
  const stranger = !registered && sender.kind !== 'contact';
  const unofficialLinks = s.links.filter((l) => !l.official);

  // R1: bank business from a personal 10-digit number.
  if (!isCall && sender.kind === 'mobile' && s.bankClaim && s.bankAction) add('R1', sender.raw);

  // R2: transactional claim from a promotional (-P) header.
  if (registered && sender.suffix === 'P' && s.bankClaim && s.transactional && (s.threat || s.secretAsk || s.urgency)) {
    add('R2', sender.raw);
  }

  // R3: "bank" on a call that is not from the 1600 series. Strong signal, not proof.
  if (isCall && (context.claimedIdentity === 'bank' || s.bankClaim) && !sender.is1600 && sender.kind !== 'contact') {
    add('R3', sender.raw || undefined);
  }

  // R4: look-alike of an allowlisted bank or government domain.
  const lookalike = unofficialLinks.find((l) => l.lookalikeOf);
  if (lookalike) add('R4', lookalike.host);

  // R5 / R6: server enrichments (RDAP domain age, Google Safe Browsing).
  const young = unofficialLinks.find((l) => (context.domainAgeDays?.[l.domain] ?? Infinity) < 30);
  if (young) add('R5', young.domain);
  const flagged = s.links.find(
    (l) => context.safeBrowsingHits?.includes(l.url) || context.safeBrowsingHits?.includes(l.domain),
  );
  if (flagged) add('R6', flagged.host);

  // R7: scan / PIN / collect request framed as receiving money.
  const receiving = Boolean(s.receive || s.lure || context.expectingToReceive);
  if ((s.collect && receiving) || (source === 'qr' && context.expectingToReceive && s.upis.length > 0)) {
    add('R7', s.collect?.phrase ?? s.upis[0]?.vpa);
  }

  // R8: named organisation, but the money goes to someone else's UPI ID.
  // Only when a stranger asks for payment: a bank's own debit alert also names a payee.
  const claimed = s.brand && !['payments', 'commerce'].includes(s.brand.kind) ? s.brand : null;
  const asksToPay = Boolean(s.payment || s.collect || source === 'qr' || s.upis.some((u) => u.amount));
  if (stranger && asksToPay && (claimed || s.authority)) {
    // Police, courts, RBI and other authorities never take payment to a UPI ID in a message,
    // so for them any UPI ID is a mismatch, even one named to look official ("rbi.verify@ybl").
    const official = Boolean(s.authority) || claimed?.kind === 'government';
    const keys = claimed ? [...claimed.keys, ...claimed.names] : [];
    const mismatch = s.upis.find((u) => {
      const haystack = `${u.vpa} ${u.payeeName ?? ''}`.toLowerCase();
      return official || u.personal || !keys.some((k) => haystack.includes(k.toLowerCase()));
    });
    if (mismatch) add('R8', mismatch.vpa);
  }

  // R9: APK file or link.
  if (s.apk) add('R9', s.apk);

  // R10: remote-access app requested, or running during a call with a stranger.
  const remoteAppActive = context.activeApps?.some((p) => rulesData.remoteAccessPackages.includes(p));
  if (s.remoteAccess || (remoteAppActive && context.onCall)) {
    add('R10', s.remoteAccess?.phrase);
  }

  // R11: authority + threat (+ secrecy). Government awareness SMS come from registered headers.
  if (stranger && !s.awareness && s.authority && (s.threat || s.secrecy)) {
    add('R11', s.authority.phrase, s.threat && s.secrecy ? 70 : undefined);
  }

  // R12: unexpected international number.
  if (sender.kind === 'international') add('R12', sender.raw);

  // R13: disguised text.
  if (cleaned.disguised) add('R13');

  // R14: shortened, odd-host or risky-TLD link.
  const odd = unofficialLinks.find((l) => l.shortener || l.riskyTld || l.oddHost);
  if (odd && !lookalike) add('R14', odd.host);

  // R15: instructions aimed at an AI filter.
  if (s.injection || cleaned.flags.smuggledText) add('R15', s.injection?.phrase);

  // R16: "relative in trouble" from an unknown number -> family safe word.
  if (stranger && s.familyClaim && s.emergency) add('R16', s.familyClaim.phrase);

  // R17: asks for OTP, PIN, CVV or password.
  if (s.secretAsk) add('R17', s.secretAsk.phrase);

  return hits;
}

export function scoreRules(hits: RuleHit[]): number {
  return Math.min(100, hits.reduce((sum, h) => sum + h.points, 0));
}
