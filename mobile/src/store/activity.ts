import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BlockedCall, CommunityIoc, DrillResult, GuardianAlert } from '@/types';

import { newId, persistStorage, STORE_VERSION } from './storage';

/** Guardian alerts: what the family sees the moment the elder is targeted. */
interface AlertsState {
  alerts: GuardianAlert[];
  push: (alert: Omit<GuardianAlert, 'id' | 'createdAt' | 'read'>) => GuardianAlert;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useAlerts = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      push: (input) => {
        const alert: GuardianAlert = { ...input, id: newId('al'), createdAt: Date.now(), read: false };
        set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) }));
        return alert;
      },
      markRead: (id) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) })),
      markAllRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
      clear: () => set({ alerts: [] }),
    }),
    { name: 'satark.alerts', version: STORE_VERSION, storage: persistStorage },
  ),
);

/** Community threat intelligence cache: hashed numbers, UPI IDs and domains. Works offline. */
interface IntelState {
  iocs: Record<string, CommunityIoc>;
  blockedCalls: BlockedCall[];
  lastSyncAt: number | null;
  upsert: (ioc: CommunityIoc) => void;
  merge: (iocs: CommunityIoc[], syncedAt: number) => void;
  logBlockedCall: (call: Omit<BlockedCall, 'id'>) => void;
  clear: () => void;
}

export const useIntel = create<IntelState>()(
  persist(
    (set) => ({
      iocs: {},
      blockedCalls: [],
      lastSyncAt: null,
      upsert: (ioc) => set((s) => ({ iocs: { ...s.iocs, [ioc.hash]: ioc } })),
      merge: (iocs, syncedAt) =>
        set((s) => ({
          iocs: { ...s.iocs, ...Object.fromEntries(iocs.map((i) => [i.hash, { ...s.iocs[i.hash], ...i }])) },
          lastSyncAt: syncedAt,
        })),
      logBlockedCall: (call) =>
        set((s) => ({ blockedCalls: [{ ...call, id: newId('bc') }, ...s.blockedCalls].slice(0, 50) })),
      clear: () => set({ iocs: {}, blockedCalls: [], lastSyncAt: null }),
    }),
    { name: 'satark.intel', version: STORE_VERSION, storage: persistStorage },
  ),
);

/** Scam drill results: the guardian's "readiness score". */
interface DrillsState {
  results: DrillResult[];
  record: (drillId: string, correct: boolean) => void;
  clear: () => void;
}

export const useDrills = create<DrillsState>()(
  persist(
    (set) => ({
      results: [],
      record: (drillId, correct) =>
        set((s) => ({
          results: [{ id: newId('dr'), drillId, at: Date.now(), correct }, ...s.results].slice(0, 100),
        })),
      clear: () => set({ results: [] }),
    }),
    { name: 'satark.drills', version: STORE_VERSION, storage: persistStorage },
  ),
);

/** Share of drills answered correctly, 0-100, or null before the first drill. */
export function readinessScore(results: DrillResult[]): number | null {
  if (results.length === 0) return null;
  const recent = results.slice(0, 10);
  return Math.round((recent.filter((r) => r.correct).length / recent.length) * 100);
}
