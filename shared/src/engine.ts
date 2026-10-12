/**
 * On-device engine: layers 1 and 2 plus the Kill Chain evidence pass.
 * Runs in well under 50 ms with no network, so most messages never leave the phone.
 */
import { classify } from './classify';
import { clean, type CleanResult } from './clean';
import { SAFE_INFO, SCAM_TYPES } from './explanations';
import { buildEvidence, highestStage, mergeEvidence, scoreStages, tacticsFrom } from './killchain';
import type { LinkFinding } from './links';
import { evaluateRules, HARD_RULES, scoreRules } from './rules';
import { parseSender, type SenderInfo } from './sender';
import { extractSignals, type Signals } from './signals';
import { parseTxnSms, type ParsedTxn } from './txn';
import type { Evidence, Indicator, LocalInput, RuleHit, ScamType, Stage, Tactic, Verdict } from './types';
import type { UpiFinding } from './upi';
import { fuseScores, verdictFor, type AnalyzeResponse } from './verdict';

export interface LocalAnalysis {
  cleaned: CleanResult;
  sender: SenderInfo;
  signals: Signals;
  rules: RuleHit[];
  ruleScore: number;
  evidence: Evidence[];
  stage: Stage;
  killChainScore: number;
  /** max(rules, Kill Chain): the offline verdict. */
  score: number;
  verdict: Verdict;
  scamType: ScamType;
  tactics: Tactic[];
  injectionAttempt: boolean;
  /** Scammer-controlled identifiers to hash and report. */
  indicators: Indicator[];
  links: LinkFinding[];
  upis: UpiFinding[];
  /** Set when the text is a bank debit/credit alert (F11). */
  txn: ParsedTxn | null;
}

function collectIndicators(sender: SenderInfo, s: Signals): Indicator[] {
  const out = new Map<string, Indicator>();
  const add = (type: Indicator['type'], value: string) => out.set(`${type}:${value}`, { type, value });

  if (sender.e164 && (sender.kind === 'mobile' || sender.kind === 'international')) add('phone', sender.e164);
  for (const phone of s.phones) {
    const digits = phone.replace(/\D/g, '').slice(-10);
    add('phone', `+91${digits}`);
  }
  for (const upi of s.upis) add('upi', upi.vpa);
  for (const link of s.links) if (!link.official) add('domain', link.domain);
  return [...out.values()];
}

export function analyzeLocal(input: LocalInput): LocalAnalysis {
  const context = input.context ?? {};
  const cleaned = clean(input.text);
  const sender = parseSender(input.sender);
  const signals = extractSignals(cleaned, sender);

  const rules = evaluateRules({ cleaned, signals, sender, source: input.source, context });
  const ruleScore = scoreRules(rules);

  const evidence = buildEvidence(cleaned, signals, sender);
  const stage = highestStage(evidence);

  // Registered senders and saved contacts rarely run scams, and scam warnings
  // quote scam phrases. Soften the behavioural score unless a hard rule fired.
  const hard = rules.some((r) => HARD_RULES.has(r.id) || r.id === 'R17');
  let trust = 1;
  if (!hard) {
    if (sender.kind === 'header') trust = 0.5;
    else if (sender.kind === 'contact') trust = 0.7;
    if (signals.awareness) trust *= 0.4;
  }
  const killChainScore = Math.round(scoreStages(evidence.map((e) => e.stage)) * trust);

  const score = fuseScores({ rules: ruleScore, killChain: killChainScore, community: 0, ml: null, ai: null });
  const verdict = verdictFor(score);
  const txn = parseTxnSms(cleaned.text, input.sender);

  return {
    cleaned,
    sender,
    signals,
    rules,
    ruleScore,
    evidence,
    stage,
    killChainScore,
    score,
    verdict,
    scamType: verdict === 'safe' && rules.length === 0 ? 'unknown' : classify(cleaned.norm, signals, rules),
    tactics: tacticsFrom(signals, evidence),
    injectionAttempt: rules.some((r) => r.id === 'R15'),
    indicators: collectIndicators(sender, signals),
    links: signals.links,
    upis: signals.upis,
    txn,
  };
}

/** A conversation's running Kill Chain state. The meter climbs as messages arrive. */
export interface ThreadState {
  evidence: Evidence[];
  stage: Stage;
  score: number;
}

export const EMPTY_THREAD: ThreadState = { evidence: [], stage: 0, score: 0 };

export function advanceThread(thread: ThreadState, evidence: readonly Evidence[], score: number): ThreadState {
  const merged = mergeEvidence(thread.evidence, evidence);
  return {
    evidence: merged,
    stage: highestStage(merged),
    score: Math.max(thread.score, score, scoreStages(merged.map((e) => e.stage))),
  };
}

/**
 * Build a full verdict from the on-device analysis and cached explanations.
 * Used offline, and as the base that server layers 3-5 can only raise.
 */
export function toResponse(
  local: LocalAnalysis,
  overrides: { thread?: ThreadState; community?: number } = {},
): AnalyzeResponse {
  const evidence = overrides.thread?.evidence ?? local.evidence;
  const stage = overrides.thread?.stage ?? local.stage;
  const community = overrides.community ?? 0;
  const layer_scores = {
    rules: local.ruleScore,
    killChain: Math.max(local.killChainScore, overrides.thread?.score ?? 0),
    community,
    ml: null,
    ai: null,
  };
  const score = fuseScores(layer_scores);
  const verdict = verdictFor(score);
  const info = SCAM_TYPES[local.scamType];

  return {
    verdict,
    score,
    scam_type: local.scamType,
    stage,
    evidence,
    tactics: local.tactics,
    injection_attempt: local.injectionAttempt,
    explanation: verdict === 'safe' ? SAFE_INFO.explanation : info.explanation,
    advice: verdict === 'safe' ? [] : info.advice.en,
    advice_l10n: verdict === 'safe' ? { hi: [], te: [] } : { hi: info.advice.hi, te: info.advice.te },
    voice: verdict === 'safe' ? SAFE_INFO.voice : info.voice,
    rules: local.rules,
    layer_scores,
    engine: 'on-device',
  };
}
