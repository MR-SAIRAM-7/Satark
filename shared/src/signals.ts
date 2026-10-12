/**
 * Signal extraction: one pass over the cleaned text that every later step
 * (rules, Kill Chain, scam type) reads from.
 */
import rules from './rules.json';
import type { CleanResult } from './clean';
import { extractLinks, findApk, type Brand, type LinkFinding } from './links';
import { findPhrase, hasPhrase, type PhraseMatch } from './match';
import type { SenderInfo } from './sender';
import { extractUpi, type UpiFinding } from './upi';

const LEX = rules.lexicon;
const BRANDS = rules.brands as Brand[];
const { verbs, secrets, negations } = rules.secretAsk;

// English negations come before the verb ("never share"); Indic ones can follow it ("చెప్పకండి").
const LEADING_ONLY = new Set(['do not', "don't", 'dont', 'never', 'not to']);

export interface Signals {
  contact: PhraseMatch | null;
  authority: PhraseMatch | null;
  impersonation: PhraseMatch | null;
  threat: PhraseMatch | null;
  urgency: PhraseMatch | null;
  lure: PhraseMatch | null;
  secrecy: PhraseMatch | null;
  payment: PhraseMatch | null;
  receive: PhraseMatch | null;
  collect: PhraseMatch | null;
  remoteAccess: PhraseMatch | null;
  familyClaim: PhraseMatch | null;
  emergency: PhraseMatch | null;
  bankAction: PhraseMatch | null;
  transactional: PhraseMatch | null;
  /** A request for OTP, PIN, CVV or password (not a "never share your OTP" advisory). */
  secretAsk: PhraseMatch | null;
  injection: PhraseMatch | null;
  /** Reads like a warning about scams rather than a scam. */
  awareness: boolean;
  brand: Brand | null;
  brandMatch: PhraseMatch | null;
  bankClaim: boolean;
  links: LinkFinding[];
  upis: UpiFinding[];
  apk: string | null;
  /** Phone numbers written inside the text (callback numbers are prime indicators). */
  phones: string[];
}

const PHONE_IN_TEXT_RE = /(?<![\dA-Za-z])(?:\+?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)/g;

function near(norm: string, index: number, length: number, phrases: readonly string[], window: number) {
  return hasPhrase(norm.slice(Math.max(0, index - window), index + length + window), phrases);
}

function findSecretAsk(norm: string): PhraseMatch | null {
  for (const secret of secrets) {
    const match = findPhrase(norm, [secret]);
    if (!match) continue;
    if (!near(norm, match.index, match.length, verbs, 45)) continue;

    const before = norm.slice(Math.max(0, match.index - 40), match.index);
    const after = norm.slice(match.index, match.index + match.length + 28);
    const negated = negations.some(
      (n) => before.includes(n) || (!LEADING_ONLY.has(n) && after.includes(n)),
    );
    if (!negated) return match;
  }
  return null;
}

function findSecrecy(norm: string): PhraseMatch | null {
  const match = findPhrase(norm, LEX.secrecy);
  // "OTP ఎవరికీ చెప్పకండి" is a bank's safety advice, not an isolation tactic.
  if (match && near(norm, match.index, match.length, secrets, 30)) return null;
  return match;
}

export function extractSignals(cleaned: CleanResult, sender: SenderInfo): Signals {
  const { norm, text } = cleaned;
  const lex = (key: keyof typeof LEX) => findPhrase(norm, LEX[key]);

  let brand: Brand | null = null;
  let brandMatch: PhraseMatch | null = null;
  for (const candidate of BRANDS) {
    const m = findPhrase(norm, candidate.names);
    if (m && (!brandMatch || m.index < brandMatch.index)) {
      brand = candidate;
      brandMatch = m;
    }
  }

  const links = extractLinks(text);
  const phones = [...new Set((text.match(PHONE_IN_TEXT_RE) ?? []).map((p) => p.replace(/[ -]/g, '')))];
  const apk = findApk(text) ?? links.find((l) => l.apk)?.url ?? null;
  const payment = lex('payment');
  const collect = lex('collect');
  const remoteAccess = lex('remoteAccess');
  const secretAsk = findSecretAsk(norm);
  // A genuine warning names the scam but asks for nothing: no link, number, payment or code.
  const asksForSomething = Boolean(
    payment || collect || remoteAccess || secretAsk || apk || phones.length || links.some((l) => !l.official),
  );
  const senderBank =
    sender.kind === 'header' &&
    BRANDS.some((b) => b.kind === 'bank' && b.keys.some((k) => sender.header?.toLowerCase().includes(k)));

  return {
    contact: lex('contact'),
    authority: lex('authority'),
    impersonation: lex('impersonation'),
    threat: lex('threat'),
    urgency: lex('urgency'),
    lure: lex('lure'),
    secrecy: findSecrecy(norm),
    payment,
    receive: lex('receive'),
    collect,
    remoteAccess,
    familyClaim: lex('familyClaim'),
    emergency: lex('emergency'),
    bankAction: lex('bankAction'),
    transactional: lex('transactional'),
    secretAsk,
    injection: findPhrase(norm, rules.injection),
    awareness: !asksForSomething && hasPhrase(norm, LEX.awareness),
    brand,
    brandMatch,
    bankClaim: brand?.kind === 'bank' || senderBank || hasPhrase(norm, LEX.bankWords),
    links,
    upis: extractUpi(text),
    apk,
    phones,
  };
}
