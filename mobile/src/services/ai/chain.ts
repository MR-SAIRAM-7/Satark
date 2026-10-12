import { llmVerdictSchema, type AnalyzeRequest, type LlmVerdict } from '@satark/shared';

import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { gemini, openRouter, sarvam, type LlmProvider } from './providers';

/** Gemini first, OpenRouter second, Sarvam for Indian-language reasoning third. */
const CHAIN: LlmProvider[] = [gemini, openRouter, sarvam];

/** Layer 4 budget: a slow model is worse than no model when a scam is in progress. */
const TIMEOUT_MS = 6000;

export interface ChainResult {
  verdict: LlmVerdict;
  engine: string;
}

function parseVerdict(raw: string): LlmVerdict | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = llmVerdictSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Multi-model fallback. A response that is slow, rate-limited or fails schema
 * validation is dropped and the next model is tried. Returns null when every
 * model fails: the rules and Kill Chain verdict still stand.
 */
export async function runLlmChain(req: AnalyzeRequest): Promise<ChainResult | null> {
  const user = buildUserPrompt(req);
  for (const provider of CHAIN) {
    if (!provider.available) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const verdict = parseVerdict(await provider.complete(SYSTEM_PROMPT, user, controller.signal));
      if (verdict) return { verdict, engine: provider.name };
    } catch {
      // Fall through to the next provider.
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
