import type { ParsedTxn } from '@satark/shared';
import { create } from 'zustand';

/** Something that needs the user's attention right now, whatever screen they are on. */
export type Interruption =
  | { kind: 'verdict'; checkId: string }
  | { kind: 'callAlert'; number: string; checkId?: string }
  | { kind: 'callBlocked'; numberMasked: string; reportCount: number }
  | { kind: 'txn'; txn: ParsedTxn; at: number; relatedCheckId: string; minutesAfter: number };

interface UiState {
  interruption: Interruption | null;
  /** Short confirmation shown at the bottom of the screen. */
  toast: { id: number; text: string; tone: 'info' | 'safe' | 'warn' } | null;
  /** Latest money-debited event, kept for the transaction screen. */
  lastTxn: Extract<Interruption, { kind: 'txn' }> | null;

  interrupt: (interruption: Interruption) => void;
  consume: () => void;
  showToast: (text: string, tone?: 'info' | 'safe' | 'warn') => void;
  hideToast: () => void;
}

/** Transient UI state. Not persisted. */
export const useUi = create<UiState>((set) => ({
  interruption: null,
  toast: null,
  lastTxn: null,
  interrupt: (interruption) =>
    set((s) => ({ interruption, lastTxn: interruption.kind === 'txn' ? interruption : s.lastTxn })),
  consume: () => set({ interruption: null }),
  showToast: (text, tone = 'info') => set({ toast: { id: Date.now(), text, tone } }),
  hideToast: () => set({ toast: null }),
}));
