/**
 * Language registry: English plus the ten Indian languages Sarvam AI supports
 * for translation (Mayura) and speech (Bulbul). English is the default.
 *
 * `ui: true` languages ship a reviewed interface translation in the app, so they
 * work offline from the first launch. Every other language is translated by
 * Sarvam the first time the user picks it, then cached on the phone.
 * Add a row here to add a language.
 */
export const LANGUAGES = [
  { code: 'en', bcp47: 'en-IN', native: 'English', english: 'English', ui: true },
  { code: 'te', bcp47: 'te-IN', native: 'తెలుగు', english: 'Telugu', ui: true },
  { code: 'hi', bcp47: 'hi-IN', native: 'हिन्दी', english: 'Hindi', ui: true },
  { code: 'ta', bcp47: 'ta-IN', native: 'தமிழ்', english: 'Tamil', ui: false },
  { code: 'kn', bcp47: 'kn-IN', native: 'ಕನ್ನಡ', english: 'Kannada', ui: false },
  { code: 'ml', bcp47: 'ml-IN', native: 'മലയാളം', english: 'Malayalam', ui: false },
  { code: 'mr', bcp47: 'mr-IN', native: 'मराठी', english: 'Marathi', ui: false },
  { code: 'bn', bcp47: 'bn-IN', native: 'বাংলা', english: 'Bengali', ui: false },
  { code: 'gu', bcp47: 'gu-IN', native: 'ગુજરાતી', english: 'Gujarati', ui: false },
  { code: 'pa', bcp47: 'pa-IN', native: 'ਪੰਜਾਬੀ', english: 'Punjabi', ui: false },
  { code: 'or', bcp47: 'od-IN', native: 'ଓଡ଼ିଆ', english: 'Odia', ui: false },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];
export type UiLang = 'te' | 'hi' | 'en';

export const DEFAULT_LANG: LangCode = 'en';
export const UI_LANGS: readonly UiLang[] = ['en', 'te', 'hi'];

/** True when the interface for this language comes from Sarvam rather than the app bundle. */
export function isTranslatedBySarvam(code: LangCode): boolean {
  return !UI_LANGS.includes(code as UiLang);
}

export function getLanguage(code: LangCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** The interface language to render for a chosen language. */
export function uiLangFor(code: LangCode): UiLang {
  return code === 'te' || code === 'hi' || code === 'en' ? code : 'en';
}

/** Pick the best available string for a language, falling back to English. */
export function pickLang<T extends { en: string }>(text: T, code: LangCode): string {
  return (text as Record<string, string | undefined>)[code] ?? text.en;
}
