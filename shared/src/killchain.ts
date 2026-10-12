/**
 * Scam Kill Chain. Scams follow the same five steps whatever the script, so
 * Satark tracks behaviour, not wording: Contact -> Impersonation ->
 * Threat or lure -> Isolation -> Payment or access.
 *
 * This on-device pass finds quoted evidence per stage from the phrase lexicon.
 * The server's LLM layer refines it, and can only raise the result.
 */
import rulesData from './rules.json';
import type { CleanResult } from './clean';
import { quoteAround, type PhraseMatch } from './match';
import type { SenderInfo } from './sender';
import type { Signals } from './signals';
import type { Evidence, Localized, Stage, Tactic } from './types';

export const STAGES = rulesData.stages as { stage: Stage; title: Localized }[];

const STAGE_WEIGHT: Record<number, number> = { 1: 5, 2: 30, 3: 30, 4: 25, 5: 30 };

/**
 * Risk from the set of stages seen. One stage alone is never a scam verdict;
 * the score jumps when stages combine, which is what a real scam looks like.
 */
export function scoreStages(stages: Iterable<Stage>): number {
  const seen = new Set(stages);
  seen.delete(0);
  let score = 0;
  for (const stage of seen) score += STAGE_WEIGHT[stage] ?? 0;
  const strong = [...seen].filter((s) => s >= 2).length;
  if (strong >= 2) score += 15;
  if (strong >= 3) score += 10;
  return Math.min(98, score);
}

export function buildEvidence(cleaned: CleanResult, s: Signals, sender: SenderInfo): Evidence[] {
  const evidence: Evidence[] = [];
  const quote = (stage: Stage, match: PhraseMatch | null | undefined, fallback?: string | null) => {
    if (match) evidence.push({ stage, quote: quoteAround(cleaned.text, match) });
    else if (fallback) evidence.push({ stage, quote: fallback });
  };

  const registered = sender.kind === 'header';
  const known = registered || sender.kind === 'contact';

  if (!known) quote(1, s.contact);

  // Impersonation: an authority, or an organisation's name used by an unregistered sender.
  if (s.authority) quote(2, s.authority);
  else if (s.brandMatch && !known && s.brand && !['payments', 'commerce'].includes(s.brand.kind)) {
    quote(2, s.brandMatch);
  } else if (s.impersonation && s.brandMatch && !registered) quote(2, s.impersonation);

  quote(3, s.threat ?? s.lure);
  quote(4, s.secrecy);
  quote(5, s.secretAsk ?? s.remoteAccess ?? null, s.apk);
  if (!evidence.some((e) => e.stage === 5)) quote(5, s.collect && s.receive ? s.collect : s.payment);

  return evidence;
}

export function highestStage(evidence: readonly Evidence[]): Stage {
  return evidence.reduce<Stage>((max, e) => (e.stage > max ? e.stage : max), 0);
}

/** Merge evidence from a new message into a conversation: one quote per stage, newest wins. */
export function mergeEvidence(previous: readonly Evidence[], next: readonly Evidence[]): Evidence[] {
  const byStage = new Map<Stage, Evidence>();
  for (const e of [...previous, ...next]) byStage.set(e.stage, e);
  return [...byStage.values()].sort((a, b) => a.stage - b.stage);
}

export function tacticsFrom(s: Signals, evidence: readonly Evidence[]): Tactic[] {
  const tactics: Tactic[] = [];
  if (s.authority) tactics.push('authority');
  if (evidence.some((e) => e.stage === 2)) tactics.push('impersonation');
  if (s.threat) tactics.push('fear');
  if (s.urgency) tactics.push('urgency');
  if (s.secrecy) tactics.push('secrecy');
  if (s.lure) tactics.push('greed');
  if (s.remoteAccess || s.apk) tactics.push('remote_access');
  if (s.secretAsk) tactics.push('credential_theft');
  return tactics;
}
