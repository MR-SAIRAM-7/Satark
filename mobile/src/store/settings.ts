import { DEFAULT_LANG, type LangCode } from '@satark/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role } from '@/types';

import { persistStorage, STORE_VERSION } from './storage';

export type TextScale = 1 | 1.15 | 1.3;
/** "system" follows the phone's light or dark setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

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
  themeMode: ThemeMode;
  voiceEnabled: boolean;
  /** Demo mode: 1930 and the complaint portal open mock screens; nothing reaches real services. */
  demoMode: boolean;
  protectionPaused: boolean;
  /** The person this phone protects. */
  elder: Person & { locality: string };
  guardian: (Person & { relation: string }) | null;
  /** One-time 6-digit code a family phone types in to link. Made on demand, valid for a few minutes. */
  pairingCode: string;
  /** When `pairingCode` stops working (ms since epoch); 0 when there is no live code. */
  pairingExpiresAt: number;
  /** Secret word the family agrees on, to defeat "relative in trouble" calls. */
  safeWord: string;

  update: (patch: Partial<Omit<SettingsState, 'update' | 'hydrated'>>) => void;
}

const defaults = {
  onboarded: false,
  role: 'elder' as Role,
  lang: DEFAULT_LANG,
  textScale: 1.15 as TextScale,
  themeMode: 'dark' as ThemeMode,
  voiceEnabled: true,
  demoMode: true,
  protectionPaused: false,
  elder: { name: '', phone: '', locality: 'Hyderabad' },
  guardian: null,
  pairingCode: '',
  pairingExpiresAt: 0,
  safeWord: '',
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...defaults,
      update: (patch) => set(patch),
    }),
    {
      name: 'satark.settings',
      version: STORE_VERSION,
      storage: persistStorage,
      partialize: ({ hydrated: _hydrated, update: _update, ...rest }) => rest,
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);
