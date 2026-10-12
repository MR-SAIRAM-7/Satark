import { getLanguage, type LangCode } from '@satark/shared';

import { env } from '@/config/env';

/**
 * Thin clients for the three AI providers. Each returns raw model text; the
 * chain in ./chain.ts validates it against the verdict schema.
 *
 * These run on the phone only while there is no backend (see config/env.ts).
 * The backend uses the same order: Gemini -> OpenRouter -> Sarvam.
 */
export interface LlmProvider {
  name: string;
  available: boolean;
  complete: (system: string, user: string, signal: AbortSignal) => Promise<string>;
}

async function postJson<T>(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

interface OpenAiStyleResponse {
  choices?: { message?: { content?: string } }[];
}

export const gemini: LlmProvider = {
  name: 'gemini',
  available: Boolean(env.gemini.apiKey),
  async complete(system, user, signal) {
    const data = await postJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`,
      { 'x-goog-api-key': env.gemini.apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      },
      signal,
    );
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  },
};

export const openRouter: LlmProvider = {
  name: 'openrouter',
  available: Boolean(env.openRouter.apiKey),
  async complete(system, user, signal) {
    const data = await postJson<OpenAiStyleResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      { Authorization: `Bearer ${env.openRouter.apiKey}`, 'X-Title': 'Satark' },
      {
        model: env.openRouter.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      signal,
    );
    return data.choices?.[0]?.message?.content ?? '';
  },
};

export const sarvam: LlmProvider = {
  name: 'sarvam',
  available: Boolean(env.sarvam.apiKey),
  async complete(system, user, signal) {
    const data = await postJson<OpenAiStyleResponse>(
      'https://api.sarvam.ai/v1/chat/completions',
      { 'api-subscription-key': env.sarvam.apiKey },
      {
        model: env.sarvam.chatModel,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      signal,
    );
    return data.choices?.[0]?.message?.content ?? '';
  },
};

/** Sarvam Bulbul text-to-speech. Returns base64 WAV, or null when no key is configured. */
export async function sarvamTts(text: string, lang: LangCode, signal?: AbortSignal): Promise<string | null> {
  if (!env.sarvam.apiKey) return null;
  const data = await postJson<{ audios?: string[] }>(
    'https://api.sarvam.ai/text-to-speech',
    { 'api-subscription-key': env.sarvam.apiKey },
    {
      text: text.slice(0, 2400),
      language_code: getLanguage(lang).bcp47,
      speaker: env.sarvam.ttsSpeaker,
      model: env.sarvam.ttsModel,
      pace: 0.95,
    },
    signal,
  );
  return data.audios?.[0] ?? null;
}

/** Sarvam Saaras speech-to-text for one audio chunk (Home Guardian). */
export async function sarvamStt(fileUri: string, signal?: AbortSignal): Promise<{ transcript: string; lang?: string } | null> {
  if (!env.sarvam.apiKey) return null;
  const form = new FormData();
  // React Native's FormData accepts a { uri, name, type } file descriptor.
  form.append('file', { uri: fileUri, name: 'chunk.wav', type: 'audio/wav' } as unknown as Blob);
  form.append('model', env.sarvam.sttModel);
  form.append('language_code', 'unknown');
  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': env.sarvam.apiKey },
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(`Sarvam STT responded ${res.status}`);
  const data = (await res.json()) as { transcript?: string; language_code?: string };
  return { transcript: data.transcript ?? '', lang: data.language_code };
}
