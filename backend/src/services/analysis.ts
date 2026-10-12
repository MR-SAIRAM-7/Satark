/**
 * Server-side analysis: layers 3-5 on top of layers 1-2 (`POST /v1/analyze`).
 *
 *   layers 1-2 again on the masked text, plus link enrichment (R5, R6)
 *   + rules the phone saw on the unmasked text
 *   + Kill Chain across the conversation
 *   + layer 5 community intelligence
 *   + layer 3 ML classifier (sender-trust scaled; on its own it can only say "suspicious")
 *   + layer 4 LLM chain (can raise, never lower)
 *   = score = max(layers), stored masked, pushed to the dashboard and the family.
 */
import {
  advanceThread,
  analyzeLocal,
  classify,
  EMPTY_THREAD,
  fuseScores,
  getRule,
  HARD_RULES,
  mask,
  maskPhone,
  raiseWith,
  SCAM_TYPES,
  scoreRules,
  THRESHOLDS,
  toResponse,
  verdictFor,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type LocalAnalysis,
  type ScamType,
  type ThreadState,
} from '@satark/shared';
import { LRUCache } from 'lru-cache';

import { features } from '../config/env';
import { Check, User, type CheckDoc } from '../db/models';
import { locate } from '../lib/geo';
import type { AuthUser } from '../middleware/auth';
import { raiseAlert } from './alerts';
import { runLlmChain } from './ai/llm';
import { enrichLinks, type Enrichment } from './enrich';
import { lookupIndicators, type CommunityHit } from './intel';
import { classifier } from './ml/classifier';
import { featureText } from './ml/features';
import { publish } from './realtime';

type Thread = ThreadState & { scamType: ScamType };
const threads = new LRUCache<string, Thread>({ max: 20_000, ttl: 6 * 60 * 60 * 1000 });
/** One guardian alert per conversation per half hour: every new message raises the meter, not the noise. */
const alerted = new LRUCache<string, true>({ max: 20_000, ttl: 30 * 60 * 1000 });

/**
 * Phones upload the sender masked ("+9198XXXXXX45"). Fill the mask with zeros so
 * the sender keeps its shape (a 10-digit mobile, an international number) and
 * the sender rules still apply.
 */
export function unmaskSender(sender: string | null | undefined): string | null {
  if (!sender) return null;
  return /^[+\d][\dXx\s()-]+$/.test(sender) && /x/i.test(sender) ? sender.replace(/x/gi, '0') : sender;
}

/** The same trust factor the on-device engine applies to the Kill Chain score. */
function senderTrust(local: LocalAnalysis): number {
  if (local.rules.some((r) => HARD_RULES.has(r.id) || r.id === 'R17')) return 1;
  let trust = local.sender.kind === 'header' ? 0.5 : local.sender.kind === 'contact' ? 0.7 : 1;
  if (local.signals.awareness) trust *= 0.4;
  return trust;
}

/** Add the ML score. When it changes the verdict, use explanations for the new tier. */
function withMl(base: AnalyzeResponse, ml: number, local: LocalAnalysis): AnalyzeResponse {
  const layer_scores = { ...base.layer_scores, ml };
  const score = fuseScores(layer_scores);
  const verdict = verdictFor(score);
  if (verdict === base.verdict) return { ...base, layer_scores, score };
  const scam_type = base.scam_type === 'unknown' ? classify(local.cleaned.norm, local.signals, local.rules) : base.scam_type;
  const info = SCAM_TYPES[scam_type];
  return {
    ...base,
    layer_scores,
    score,
    verdict,
    scam_type,
    explanation: info.explanation,
    advice: info.advice.en,
    advice_l10n: { hi: info.advice.hi, te: info.advice.te },
    voice: info.voice,
  };
}

export interface AnalyzeOptions {
  user?: AuthUser;
  channel?: CheckDoc['channel'];
  /** Locality for the dashboard map when there is no signed-in user (WhatsApp, simulator). */
  locality?: string;
}

export interface AnalyzeResult {
  response: AnalyzeResponse;
  explain: {
    check_id: string;
    ml: { probability: number; score: number; top: { feature: string; weight: number }[]; model: string };
    community_hits: CommunityHit[];
    enrichment: Enrichment | null;
    latency_ms: number;
  };
  local: LocalAnalysis;
  check: CheckDoc;
}

export async function analyzeMessage(req: AnalyzeRequest, opts: AnalyzeOptions = {}): Promise<AnalyzeResult> {
  const started = performance.now();
  const sender = unmaskSender(req.sender ?? req.sender_header);
  const context = { onCall: req.context?.on_call, expectingToReceive: req.context?.expecting_to_receive };

  // Layers 1-2, then again with domain age and Safe Browsing if there are links.
  let local = analyzeLocal({ text: req.text, source: req.source, sender, context });
  const enrichment = await enrichLinks(local.links);
  if (enrichment && (Object.keys(enrichment.domainAgeDays).length || enrichment.safeBrowsingHits.length)) {
    local = analyzeLocal({ text: req.text, source: req.source, sender, context: { ...context, ...enrichment } });
  }

  // The phone ran the rules on the unmasked text and the real sender: those hits count too.
  const phoneRules = (req.context?.local_rules ?? [])
    .filter((id) => !local.rules.some((r) => r.id === id))
    .map((id) => ({ id, points: getRule(id)?.points ?? 0 }))
    .filter((r) => r.points > 0);
  const rules = [...local.rules, ...phoneRules];
  const ruleScore = Math.max(scoreRules(rules), req.context?.local_rule_score ?? 0);
  const merged: LocalAnalysis = {
    ...local,
    rules,
    ruleScore,
    score: Math.max(ruleScore, local.killChainScore),
    injectionAttempt: local.injectionAttempt || rules.some((r) => r.id === 'R15'),
  };

  // Kill Chain across the conversation, so the meter climbs message by message.
  const threadKey = req.thread_id ? `${opts.user?.id ?? 'anon'}:${req.thread_id}` : null;
  const previous = threadKey ? threads.get(threadKey) : undefined;
  const thread = threadKey ? advanceThread(previous ?? EMPTY_THREAD, merged.evidence, merged.score) : undefined;

  // Layer 5.
  const community = await lookupIndicators(local.indicators);
  let response = toResponse(merged, { thread, community: community.score, scamType: previous?.scamType });

  // Layer 3. On its own it may only raise to "suspicious": red alerts need corroboration.
  const ml = classifier().score(featureText(req.text));
  let mlScore = Math.round(ml.probability * 100 * senderTrust(merged));
  const corroborated =
    response.layer_scores.rules >= THRESHOLDS.suspicious ||
    response.layer_scores.killChain >= THRESHOLDS.suspicious ||
    community.score > 0;
  if (!corroborated) mlScore = Math.min(mlScore, THRESHOLDS.scam - 1);
  response = withMl(response, mlScore, merged);

  // Layer 4, only when something is already suspicious (latency and cost).
  if (features.llm && response.score >= THRESHOLDS.suspicious) {
    const llm = await runLlmChain(req);
    if (llm) response = raiseWith(response, llm.verdict, llm.engine);
  }
  if (response.engine === 'on-device') response.engine = 'cached';
  if (threadKey && thread) threads.set(threadKey, { ...thread, scamType: response.scam_type });

  // Store masked text only.
  const owner = opts.user ? await User.findById(opts.user.id).lean() : null;
  const place = locate(owner?.locality ?? opts.locality);
  const latencyMs = Math.round(performance.now() - started);
  const check = await Check.create({
    user: owner?._id,
    clientId: req.client_id,
    source: req.source,
    channel: opts.channel ?? 'app',
    maskedText: mask(local.cleaned.text).slice(0, 2000),
    senderMasked: req.sender ? maskPhone(req.sender) : undefined,
    threadId: req.thread_id,
    verdict: response.verdict,
    score: response.score,
    stage: response.stage,
    scamType: response.scam_type,
    layerScores: response.layer_scores,
    rules: response.rules.map((r) => r.id),
    tactics: response.tactics,
    injection: response.injection_attempt,
    engine: response.engine,
    locality: place.locality,
    geo: { lat: place.lat, lng: place.lng },
    latencyMs,
  });

  // An officer testing a message in the dashboard's analyzer is not a scam in the city: keep it off the feed.
  if (response.verdict !== 'safe' && opts.channel !== 'dashboard') {
    const label = SCAM_TYPES[response.scam_type].label.en;
    await publish({
      type: 'check',
      severity: response.verdict === 'scam' ? 'warning' : 'info',
      title: `${response.verdict === 'scam' ? 'Scam' : 'Suspicious'} ${req.source === 'call' || req.source === 'transcript' ? 'call' : 'message'}: ${label}`,
      detail: `Score ${response.score} · stage ${response.stage}${response.injection_attempt ? ' · prompt-injection attempt' : ''}`,
      scamType: response.scam_type,
      locality: place.locality,
      ref: check.id,
    });
  }

  // 70+: alert the family, once per conversation.
  const alertKey = threadKey ?? check.id;
  if (response.verdict === 'scam' && owner?.role === 'elder' && !alerted.has(alertKey)) {
    alerted.set(alertKey, true);
    await raiseAlert({
      elderId: owner._id,
      kind: req.source === 'call' || req.source === 'transcript' ? 'scam_call' : 'scam_message',
      severity: response.stage >= 4 ? 'critical' : 'warning',
      title: `${owner.name || 'Your family member'} received a ${SCAM_TYPES[response.scam_type].label.en.toLowerCase()}`,
      summary: response.explanation.en,
      score: response.score,
      scamType: response.scam_type,
      checkId: check._id,
      locality: place.locality,
    });
  }

  return {
    response,
    explain: {
      check_id: check.id,
      ml: { probability: Math.round(ml.probability * 1000) / 1000, score: mlScore, top: ml.top, model: classifier().version },
      community_hits: community.hits,
      enrichment,
      latency_ms: latencyMs,
    },
    local: merged,
    check,
  };
}
