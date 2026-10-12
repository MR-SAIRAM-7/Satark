import { pickLang, uiLangFor, type LangCode, type UiLang } from '@satark/shared';
import { useCallback } from 'react';

import { useSettings } from '@/store/settings';

import { en, type StringKey } from './en';
import { hi } from './hi';
import { te } from './te';

const dictionaries: Record<UiLang, Partial<Record<StringKey, string>>> = { en, hi, te };

export type Params = Record<string, string | number>;
export type Translate = (key: StringKey, params?: Params) => string;

/** Translate outside React (services, background tasks). */
export function translate(lang: LangCode, key: StringKey, params?: Params): string {
  const template = dictionaries[uiLangFor(lang)][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export function tNow(key: StringKey, params?: Params): string {
  return translate(useSettings.getState().lang, key, params);
}

export function useT(): Translate {
  const lang = useSettings((s) => s.lang);
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

/** Pick a `{ en, hi, te }` value in the user's language. */
export function useLocalized(): <T extends { en: string }>(text: T) => string {
  const lang = useSettings((s) => s.lang);
  return useCallback((text) => pickLang(text, lang), [lang]);
}

export type { StringKey };
