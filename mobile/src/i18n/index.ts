import type { LangCode } from '@satark/shared';
import { useCallback } from 'react';

import { requestPhrase } from '@/services/translation';
import { useLangPacks } from '@/store/langPacks';
import { useSettings } from '@/store/settings';

import { en, type StringKey } from './en';
import { hi } from './hi';
import { te } from './te';

/**
 * English is the default and the source of truth. Telugu and Hindi are bundled;
 * every other language is translated by Sarvam (services/translation.ts) and
 * read from the langPacks store. Anything missing falls back to English.
 */
const bundled: Partial<Record<LangCode, Partial<Record<StringKey, string>>>> = { en, hi, te };

export type Params = Record<string, string | number>;
export type Translate = (key: StringKey, params?: Params) => string;

function lookup(lang: LangCode, key: StringKey, pack?: Record<string, string>): string {
  return bundled[lang]?.[key] ?? pack?.[key] ?? en[key];
}

function fill(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

/** Translate outside React (services, background tasks). */
export function translate(lang: LangCode, key: StringKey, params?: Params): string {
  return fill(lookup(lang, key, useLangPacks.getState().packs[lang]), params);
}

export function tNow(key: StringKey, params?: Params): string {
  return translate(useSettings.getState().lang, key, params);
}

export function useT(): Translate {
  const lang = useSettings((s) => s.lang);
  // Subscribing to the pack re-renders the screen the moment Sarvam's translation lands.
  const pack = useLangPacks((s) => s.packs[lang]);
  return useCallback((key, params) => fill(lookup(lang, key, pack), params), [lang, pack]);
}

/**
 * Text that is not an interface string: a `{ en, hi, te }` value from the
 * engine, or plain English from the AI layer. Returns the user's language when
 * available, otherwise English now and Sarvam's translation as soon as it arrives.
 */
export function useLocalized(): (text: { en: string } | string) => string {
  const lang = useSettings((s) => s.lang);
  const phrases = useLangPacks((s) => s.phrases[lang]);

  return useCallback(
    (text) => {
      const english = typeof text === 'string' ? text : text.en;
      const native = typeof text === 'string' ? undefined : (text as Record<string, string | undefined>)[lang];
      if (native) return native;
      if (lang === 'en') return english;
      const cached = phrases?.[english];
      // Not translated yet: show English now and queue it. The request is batched,
      // de-duplicated and asynchronous, so asking again on every render is harmless.
      if (!cached) requestPhrase(lang, english);
      return cached ?? english;
    },
    [lang, phrases],
  );
}

export type { StringKey };
