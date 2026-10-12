import type { LangCode } from '@satark/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORE_VERSION } from './storage';

export type PackStatus = 'loading' | 'ready' | 'partial' | 'unavailable';

const MAX_PHRASES = 500;

interface LangPacksState {
  /** Interface strings translated by Sarvam, per language, keyed by string key. */
  packs: Partial<Record<LangCode, Record<string, string>>>;
  /** Other text (explanations, advice, labels) translated on demand, keyed by its English source. */
  phrases: Partial<Record<LangCode, Record<string, string>>>;
  status: Partial<Record<LangCode, PackStatus>>;

  setPack: (lang: LangCode, pack: Record<string, string>) => void;
  addPhrases: (lang: LangCode, phrases: Record<string, string>) => void;
  setStatus: (lang: LangCode, status: PackStatus) => void;
}

/**
 * Cache of Sarvam translations. Persisted, so a language is translated once and
 * then works offline like the bundled ones.
 */
export const useLangPacks = create<LangPacksState>()(
  persist(
    (set) => ({
      packs: {},
      phrases: {},
      status: {},
      setPack: (lang, pack) => set((s) => ({ packs: { ...s.packs, [lang]: { ...s.packs[lang], ...pack } } })),
      addPhrases: (lang, phrases) =>
        set((s) => {
          const merged = Object.entries({ ...s.phrases[lang], ...phrases });
          return { phrases: { ...s.phrases, [lang]: Object.fromEntries(merged.slice(-MAX_PHRASES)) } };
        }),
      setStatus: (lang, status) => set((s) => ({ status: { ...s.status, [lang]: status } })),
    }),
    {
      name: 'satark.langPacks',
      version: STORE_VERSION,
      storage: persistStorage,
      // "loading" must not survive a restart, or the picker would spin forever.
      partialize: ({ packs, phrases }) => ({ packs, phrases }),
    },
  ),
);
