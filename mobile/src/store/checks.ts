import { advanceThread, EMPTY_THREAD, type Evidence, type ThreadState } from '@satark/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CheckRecord, ConversationThread } from '@/types';

import { persistStorage, STORE_VERSION } from './storage';

const MAX_CHECKS = 200;
/** A conversation goes quiet after this long; the next message starts a new Kill Chain. */
const THREAD_IDLE_MS = 6 * 60 * 60 * 1000;

interface ChecksState {
  checks: CheckRecord[];
  threads: Record<string, ConversationThread>;

  add: (check: CheckRecord) => void;
  patch: (id: string, patch: Partial<CheckRecord>) => void;
  /** Current Kill Chain state for a conversation, or a fresh one. */
  threadState: (threadId: string) => ThreadState;
  advance: (threadId: string, sender: string | null, evidence: Evidence[], score: number, checkId: string) => ConversationThread;
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

      threadState: (threadId) => {
        const thread = get().threads[threadId];
        if (!thread || Date.now() - thread.updatedAt > THREAD_IDLE_MS) return EMPTY_THREAD;
        return { evidence: thread.evidence, stage: thread.stage, score: thread.score };
      },

      advance: (threadId, sender, evidence, score, checkId) => {
        const previous = get().threads[threadId];
        const fresh = !previous || Date.now() - previous.updatedAt > THREAD_IDLE_MS;
        const next = advanceThread(fresh ? EMPTY_THREAD : previous, evidence, score);
        const thread: ConversationThread = {
          id: threadId,
          sender,
          ...next,
          updatedAt: Date.now(),
          checkIds: [...(fresh ? [] : previous.checkIds), checkId],
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
