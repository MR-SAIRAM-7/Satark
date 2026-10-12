import { getLanguage, type LangCode } from '@satark/shared';

import { env } from '@/config/env';

/**
 * Sarvam Mayura translation, English -> the user's chosen Indian language.
 * Used directly only while there is no backend; with a backend the app calls
 * `/v1/translate`, which runs this same logic server-side.
 */

/** Mayura accepts up to 1000 characters per request. */
const MAX_CHARS = 900;
const CONCURRENCY = 4;
const SEPARATOR = '\n';

async function translateOne(text: string, lang: LangCode): Promise<string | null> {
  const res = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': env.sarvam.apiKey },
    body: JSON.stringify({
      input: text,
      source_language_code: 'en-IN',
      target_language_code: getLanguage(lang).bcp47,
      model: env.sarvam.translateModel,
      mode: 'formal',
      numerals_format: 'international',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { translated_text?: string };
  return data.translated_text?.trim() || null;
}

/** Group short strings into requests of up to MAX_CHARS, one string per line. */
function chunk(texts: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let size = 0;
  texts.forEach((text, index) => {
    const single = text.includes(SEPARATOR) || text.length > MAX_CHARS;
    if (single || size + text.length + 1 > MAX_CHARS) {
      if (current.length) groups.push(current);
      current = [];
      size = 0;
    }
    if (single) groups.push([index]);
    else {
      current.push(index);
      size += text.length + 1;
    }
  });
  if (current.length) groups.push(current);
  return groups;
}

async function inParallel<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, async () => {
      while (next < jobs.length) {
        const index = next++;
        results[index] = await jobs[index]!();
      }
    }),
  );
  return results;
}

/**
 * Translate many strings. Returns one entry per input, `null` where translation
 * failed, so callers can keep the English for just those strings.
 */
export async function sarvamTranslateMany(texts: string[], lang: LangCode): Promise<(string | null)[] | null> {
  if (!env.sarvam.apiKey) return null;
  const out: (string | null)[] = texts.map(() => null);

  const jobs = chunk(texts).map((indexes) => async () => {
    try {
      const joined = indexes.map((i) => texts[i]).join(SEPARATOR);
      const translated = await translateOne(joined.slice(0, MAX_CHARS + 90), lang);
      const lines = translated?.split(SEPARATOR).map((l) => l.trim()).filter(Boolean) ?? [];
      if (lines.length === indexes.length) {
        indexes.forEach((i, n) => (out[i] = lines[n] ?? null));
        return;
      }
      // The model merged or split lines: translate this group one string at a time.
      if (indexes.length > 1) {
        for (const i of indexes) out[i] = await translateOne(texts[i]!, lang).catch(() => null);
      }
    } catch {
      // Leave this group untranslated.
    }
  });

  await inParallel(jobs, CONCURRENCY);
  return out;
}
