/**
 * Layer 4 - multi-model fallback: Gemini -> OpenRouter -> Sarvam-105B. The
 * same prompt and parser as the phone (@satark/shared). A response that is
 * slow, rate-limited or fails schema validation is dropped and the next model
 * is tried; when all fail the rules + ML verdict still stands.
 */
import { buildUserPrompt, parseLlmVerdict, SYSTEM_PROMPT, type AnalyzeRequest, type LlmVerdict } from '@satark/shared';

import { env } from '../../config/env';
import { postJson } from '../../lib/http';
import { logger } from '../../lib/logger';

const TIMEOUT_MS = 6000;

interface Provider {
  name: string;
  available: boolean;
  complete: (system: string, user: string) => Promise<string>;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

const chat = (url: string, headers: Record<string, string>, model: string, json: boolean) => async (system: string, user: string) => {
  const data = await postJson<ChatResponse>(
    url,
    {
      model,
      temperature: 0.1,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    },
    headers,
    TIMEOUT_MS,
  );
  return data.choices?.[0]?.message?.content ?? '';
};

const PROVIDERS: Provider[] = [
  {
    name: 'gemini',
    available: Boolean(env.GEMINI_API_KEY),
    async complete(system, user) {
      const data = await postJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        },
        { 'x-goog-api-key': env.GEMINI_API_KEY ?? '' },
        TIMEOUT_MS,
      );
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    },
  },
  {
    name: 'openrouter',
    available: Boolean(env.OPENROUTER_API_KEY),
    complete: chat('https://openrouter.ai/api/v1/chat/completions', { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'X-Title': 'Satark' }, env.OPENROUTER_MODEL, true),
  },
  {
    name: 'sarvam',
    available: Boolean(env.SARVAM_API_KEY),
    complete: chat('https://api.sarvam.ai/v1/chat/completions', { 'api-subscription-key': env.SARVAM_API_KEY ?? '' }, env.SARVAM_CHAT_MODEL, false),
  },
];

export async function runLlmChain(req: AnalyzeRequest): Promise<{ verdict: LlmVerdict; engine: string } | null> {
  const user = buildUserPrompt(req);
  for (const provider of PROVIDERS) {
    if (!provider.available) continue;
    try {
      const verdict = parseLlmVerdict(await provider.complete(SYSTEM_PROMPT, user));
      if (verdict) return { verdict, engine: provider.name };
      logger.warn({ provider: provider.name }, 'LLM response failed schema validation');
    } catch (err) {
      logger.warn({ provider: provider.name, err: (err as Error).message }, 'LLM provider failed');
    }
  }
  return null;
}
