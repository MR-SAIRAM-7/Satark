/**
 * The verdict contract shared by the app and the API (`POST /v1/analyze`).
 * Every LLM response is validated against `llmVerdictSchema`; one that fails is
 * dropped and the next model in the fallback chain is tried.
 */
import { z } from 'zod';
import rulesData from './rules.json';
import type { LayerScores, Verdict } from './types';

export const THRESHOLDS = rulesData.thresholds;

export function verdictFor(score: number): Verdict {
  if (score >= THRESHOLDS.scam) return 'scam';
  if (score >= THRESHOLDS.suspicious) return 'suspicious';
  return 'safe';
}

/**
 * score = max(rules, Kill Chain, ML, community, AI).
 * The AI layer can raise the risk but can never lower it.
 */
export function fuseScores(layers: LayerScores): number {
  const values = [layers.rules, layers.killChain, layers.community, layers.ml ?? 0, layers.ai ?? 0];
  return Math.max(0, Math.min(100, Math.round(Math.max(...values))));
}

/** Live-call cut rule: 85+ and stage 4 or 5. */
export function shouldCutCall(score: number, stage: number): boolean {
  return score >= THRESHOLDS.cut && stage >= 4;
}

const stageSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const localizedSchema = z.object({ en: z.string(), hi: z.string(), te: z.string() }).catchall(z.string());

export const scamTypeSchema = z.enum([
  'digital_arrest', 'kyc_bank', 'investment', 'electricity', 'courier', 'lottery', 'job_task',
  'upi_collect', 'malware_apk', 'remote_access', 'family_emergency', 'sim_block', 'phishing_link',
  'unknown',
]);

export const sourceSchema = z.enum([
  'sms', 'whatsapp', 'share', 'paste', 'forward', 'call', 'transcript', 'link', 'qr',
]);

/** Layer 4 output: exactly what the LLM must return. */
export const llmVerdictSchema = z.object({
  verdict: z.enum(['safe', 'suspicious', 'scam']),
  score: z.number().min(0).max(100),
  scam_type: scamTypeSchema,
  stage: stageSchema,
  evidence: z.array(z.object({ stage: stageSchema, quote: z.string().max(240) })).max(8),
  tactics: z.array(z.string()).max(8),
  injection_attempt: z.boolean(),
  explanation: localizedSchema,
  advice: z.array(z.string()).max(6),
});
export type LlmVerdict = z.infer<typeof llmVerdictSchema>;

export const analyzeRequestSchema = z.object({
  source: sourceSchema,
  sender: z.string().max(64).nullable().optional(),
  sender_header: z.string().max(32).nullable().optional(),
  /** Masked on the phone before upload. */
  text: z.string().min(1).max(8000),
  lang: z.string().min(2).max(5).default('te'),
  /** Conversation key, so the Kill Chain meter can climb across messages. */
  thread_id: z.string().max(64).optional(),
  context: z
    .object({
      on_call: z.boolean().optional(),
      local_rule_score: z.number().min(0).max(100).optional(),
      local_rules: z.array(z.string()).optional(),
      expecting_to_receive: z.boolean().optional(),
    })
    .optional(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

/** `/v1/analyze` response: the LLM contract plus the fused score and the layers behind it. */
export const analyzeResponseSchema = llmVerdictSchema.extend({
  rules: z.array(z.object({ id: z.string(), points: z.number(), match: z.string().optional() })).default([]),
  layer_scores: z.object({
    rules: z.number(),
    killChain: z.number(),
    community: z.number(),
    ml: z.number().nullable(),
    ai: z.number().nullable(),
  }),
  advice_l10n: z.object({ hi: z.array(z.string()), te: z.array(z.string()) }).optional(),
  /** Short line to speak aloud, per language. */
  voice: localizedSchema.optional(),
  /** Which engine produced the explanation: "gemini", "openrouter", "sarvam", "cached"... */
  engine: z.string().optional(),
});
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
