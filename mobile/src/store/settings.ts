import { DEFAULT_LANG, type LangCode } from '@satark/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role } from '@/types';

import { persistStorage, STORE_VERSION } from './storage';

export type TextScale = 1 | 1.15 | 1.3;

export interface Person {
  name: string;
  phone: string;
}

interface SettingsState {
  hydrated: boolean;
  onboarded: boolean;
  role: Role;
  lang: LangCode;
  textScale: TextScale;
  voiceEnabled: boolean;
  /** Demo mode: 1930 and the complaint portal open mock screens; nothing reaches real services. */
  demoMode: boolean;
  protectionPaused: boolean;
  /** The person this phone protects. */
  elder: Person & { locality: string };
  guardian: (Person & { relation: string }) | null;
  /** 6-digit code the guardian enters to link phones. */
  pairingCode: string;
  /** Secret word the family agrees on, to defeat "relative in trouble" calls. */
  safeWord: string;

  update: (patch: Partial<Omit<SettingsState, 'update' | 'reset' | 'hydrated'>>) => void;
  reset: () => void;
}

const makePairingCode = () => String(Math.floor(100000 + Math.random() * 900000));

const defaults = {
  onboarded: false,
  role: 'elder' as Role,
  lang: DEFAULT_LANG,
  textScale: 1.15 as TextScale,
  voiceEnabled: true,
  demoMode: true,
  protectionPaused: false,
  elder: { name: '', phone: '', locality: 'Hyderabad' },
  guardian: null,
  pairingCode: makePairingCode(),
  safeWord: '',
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...defaults,
      update: (patch) => set(patch),
      reset: () => set({ ...defaults, pairingCode: makePairingCode() }),
    }),
    {
      name: 'satark.settings',
      version: STORE_VERSION,
      storage: persistStorage,
      partialize: ({ hydrated: _hydrated, update: _update, reset: _reset, ...rest }) => rest,
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);
