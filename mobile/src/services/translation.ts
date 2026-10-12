import { isTranslatedBySarvam, type LangCode } from '@satark/shared';

import { en } from '@/i18n/en';
import { api } from '@/services/api';
import { useLangPacks } from '@/store/langPacks';

/**
 * Sarvam-powered localisation for every language that is not bundled.
 *
 * English is the source of truth. Telugu and Hindi ship reviewed translations
 * in the app. Any other language the user picks is translated here through
 * Sarvam Mayura: the whole interface once (then cached on the phone), and
 * explanations, advice and labels on demand as they are shown.
 */

/** A translation that dropped a {placeholder} would show broken text: keep English instead. */
function keepsPlaceholders(source: string, translated: string): boolean {
  return (source.match(/\{\w+\}/g) ?? []).every((token) => translated.includes(token));
}

const inFlight = new Map<LangCode, Promise<void>>();

/** Translate the interface into `lang` if it is not bundled or cached yet. */
export function ensureLanguagePack(lang: LangCode): Promise<void> {
  if (!isTranslatedBySarvam(lang)) return Promise.resolve();
  const existing = inFlight.get(lang);
  if (existing) return existing;

  const job = (async () => {
    const store = useLangPacks.getState();
    const cached = store.packs[lang] ?? {};
    const keys = (Object.keys(en) as (keyof typeof en)[]).filter((key) => !cached[key]);
    if (keys.length === 0) {
      store.setStatus(lang, 'ready');
      return;
    }

    store.setStatus(lang, 'loading');
    const results = await api.translate(keys.map((key) => en[key]), lang);
    if (!results) {
      // No Sarvam access right now: the interface stays in English; voice warnings still work.
      store.setStatus(lang, Object.keys(cached).length ? 'partial' : 'unavailable');
      return;
    }

    const pack: Record<string, string> = {};
    keys.forEach((key, index) => {
      const translated = results[index];
      if (translated && keepsPlaceholders(en[key], translated)) pack[key] = translated;
    });
    store.setPack(lang, pack);
    store.setStatus(lang, Object.keys(pack).length === keys.length ? 'ready' : 'partial');
  })().finally(() => inFlight.delete(lang));

  inFlight.set(lang, job);
  return job;
}

// On-demand phrases are batched: a screen asks for several strings in one render.
const queue = new Map<LangCode, Set<string>>();
const requested = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  timer = null;
  const batches = [...queue.entries()];
  queue.clear();
  for (const [lang, set] of batches) {
    const texts = [...set];
    const results = await api.translate(texts, lang).catch(() => null);
    if (!results) {
      // Let these be asked for again later, e.g. once the phone is back online.
      texts.forEach((text) => requested.delete(`${lang}:${text}`));
      continue;
    }
    const phrases: Record<string, string> = {};
    texts.forEach((text, index) => {
      const translated = results[index];
      if (translated) phrases[text] = translated;
    });
    useLangPacks.getState().addPhrases(lang, phrases);
  }
}

/** Ask for `english` in `lang`. The result arrives in the langPacks store; safe to call repeatedly. */
export function requestPhrase(lang: LangCode, english: string): void {
  if (!english || !isTranslatedBySarvam(lang)) return;
  const id = `${lang}:${english}`;
  if (requested.has(id)) return;
  requested.add(id);
  if (!queue.has(lang)) queue.set(lang, new Set());
  queue.get(lang)!.add(english);
  timer ??= setTimeout(flush, 60);
}
