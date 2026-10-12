/** Sarvam AI voice and language services: Bulbul (TTS), Saaras (STT), Mayura (translation). */
import { getLanguage, type LangCode } from '@satark/shared';

import { env } from '../../config/env';
import { postJson } from '../../lib/http';

const headers = () => ({ 'api-subscription-key': env.SARVAM_API_KEY ?? '' });
const bcp47 = (lang: string) => getLanguage(lang as LangCode).bcp47;

export async function tts(text: string, lang: string): Promise<string | null> {
  if (!env.SARVAM_API_KEY) return null;
  const data = await postJson<{ audios?: string[] }>(
    'https://api.sarvam.ai/text-to-speech',
    { text: text.slice(0, 2400), language_code: bcp47(lang), speaker: env.SARVAM_TTS_SPEAKER, model: env.SARVAM_TTS_MODEL, pace: 0.95 },
    headers(),
    8000,
  );
  return data.audios?.[0] ?? null;
}

/** Audio stays in memory: it is never written to disk or the database. */
export async function stt(audio: Buffer, mime = 'audio/wav'): Promise<{ transcript: string; lang?: string } | null> {
  if (!env.SARVAM_API_KEY) return null;
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), 'chunk.wav');
  form.append('model', env.SARVAM_STT_MODEL);
  form.append('language_code', 'unknown');
  const res = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: headers(), body: form, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Sarvam STT responded ${res.status}`);
  const data = (await res.json()) as { transcript?: string; language_code?: string };
  return { transcript: data.transcript ?? '', lang: data.language_code };
}

const MAX_CHARS = 900;

async function translateOne(text: string, lang: string): Promise<string | null> {
  const data = await postJson<{ translated_text?: string }>(
    'https://api.sarvam.ai/translate',
    {
      input: text.slice(0, 1000),
      source_language_code: 'en-IN',
      target_language_code: bcp47(lang),
      model: env.SARVAM_TRANSLATE_MODEL,
      mode: 'formal',
      numerals_format: 'international',
    },
    headers(),
    15_000,
  ).catch(() => null);
  return data?.translated_text?.trim() || null;
}

/**
 * English -> `lang`, one result per input (null where it failed). Short strings
 * are batched one per line to save requests; a batch whose line count comes
 * back different is retried string by string.
 */
export async function translateMany(texts: string[], lang: string): Promise<(string | null)[] | null> {
  if (!env.SARVAM_API_KEY) return null;
  if (lang === 'en') return texts;
  const out: (string | null)[] = texts.map(() => null);
  const groups: number[][] = [];
  let current: number[] = [];
  let size = 0;
  texts.forEach((t, i) => {
    if (t.includes('\n') || size + t.length + 1 > MAX_CHARS) {
      if (current.length) groups.push(current);
      current = [];
      size = 0;
    }
    current.push(i);
    size += t.length + 1;
  });
  if (current.length) groups.push(current);

  await Promise.all(
    groups.map(async (group) => {
      const lines = (await translateOne(group.map((i) => texts[i]).join('\n'), lang))?.split('\n').map((l) => l.trim()).filter(Boolean) ?? [];
      if (lines.length === group.length) group.forEach((i, n) => (out[i] = lines[n] ?? null));
      else for (const i of group) out[i] = await translateOne(texts[i]!, lang);
    }),
  );
  return out;
}
