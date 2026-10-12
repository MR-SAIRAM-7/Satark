import { advanceThread, EMPTY_THREAD, type Evidence, type ScamType } from '@satark/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CheckRecord, ConversationThread } from '@/types';

import { persistStorage, STORE_VERSION } from './storage';

const MAX_CHECKS = 200;
/** A conversation goes quiet after this long; the next message starts a new Kill Chain. */
const THREAD_IDLE_MS = 6 * 60 * 60 * 1000;

export interface ThreadUpdate {
  threadId: string;
  sender: string | null;
  evidence: Evidence[];
  score: number;
  scamType: ScamType;
  checkId: string;
}

interface ChecksState {
  checks: CheckRecord[];
  threads: Record<string, ConversationThread>;

  add: (check: CheckRecord) => void;
  patch: (id: string, patch: Partial<CheckRecord>) => void;
  /** Fold a new message into its conversation, so the Kill Chain meter climbs. */
  advance: (update: ThreadUpdate) => ConversationThread;
  clear: () => void;
}

export const useChecks = create<ChecksState>()(
  persist(
    (set, get) => ({
      checks: [],
      threads: {},

      add: (check) => set((s) => ({ checks: [check, ...s.checks].slice(0, MAX_CHECKS) })),

      patch: (id, patch) =>
        set((s) => ({ checks: s.checks.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      advance: ({ threadId, sender, evidence, score, scamType, checkId }) => {
        const existing = get().threads[threadId];
        const previous = existing && Date.now() - existing.updatedAt <= THREAD_IDLE_MS ? existing : null;
        const thread: ConversationThread = {
          id: threadId,
          sender,
          ...advanceThread(previous ?? EMPTY_THREAD, evidence, score),
          // The first message that names the scam sets the type for the conversation.
          scamType: previous && previous.scamType !== 'unknown' ? previous.scamType : scamType,
          updatedAt: Date.now(),
          checkIds: [...(previous?.checkIds ?? []), checkId],
        };
        set((s) => ({ threads: { ...s.threads, [threadId]: thread } }));
        return thread;
      },

      clear: () => set({ checks: [], threads: {} }),
    }),
    { name: 'satark.checks', version: STORE_VERSION, storage: persistStorage },
  ),
);

export const selectCheck = (id: string | undefined) => (s: ChecksState) =>
  id ? s.checks.find((c) => c.id === id) : undefined;

/** The most recent high-risk check within `windowMs`, for the transaction-after-scam alert. */
export function recentHighRisk(windowMs: number, now = Date.now()): CheckRecord | undefined {
  return useChecks
    .getState()
    .checks.find((c) => c.response.verdict === 'scam' && now - c.createdAt <= windowMs && !c.txn);
}
