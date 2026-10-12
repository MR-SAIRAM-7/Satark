import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Complaint, FirEvent, WhatsAppMessage } from '@/types';

import { persistStorage, STORE_VERSION } from './storage';

interface ComplaintsState {
  complaints: Complaint[];
  add: (complaint: Complaint) => void;
  patch: (id: string, patch: Partial<Complaint>) => void;
  addEvent: (id: string, event: FirEvent) => void;
  addWhatsApp: (id: string, message: WhatsAppMessage) => void;
  patchWhatsApp: (id: string, messageId: string, patch: Partial<WhatsAppMessage>) => void;
  clear: () => void;
}

const update = (list: Complaint[], id: string, fn: (c: Complaint) => Complaint) =>
  list.map((c) => (c.id === id ? fn(c) : c));

export const useComplaints = create<ComplaintsState>()(
  persist(
    (set) => ({
      complaints: [],
      add: (complaint) => set((s) => ({ complaints: [complaint, ...s.complaints] })),
      patch: (id, patch) => set((s) => ({ complaints: update(s.complaints, id, (c) => ({ ...c, ...patch })) })),
      addEvent: (id, event) =>
        set((s) => ({
          complaints: update(s.complaints, id, (c) =>
            c.timeline.some((e) => e.stage === event.stage) ? c : { ...c, timeline: [...c.timeline, event] },
          ),
        })),
      addWhatsApp: (id, message) =>
        set((s) => ({ complaints: update(s.complaints, id, (c) => ({ ...c, whatsapp: [...c.whatsapp, message] })) })),
      patchWhatsApp: (id, messageId, patch) =>
        set((s) => ({
          complaints: update(s.complaints, id, (c) => ({
            ...c,
            whatsapp: c.whatsapp.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          })),
        })),
      clear: () => set({ complaints: [] }),
    }),
    { name: 'satark.complaints', version: STORE_VERSION, storage: persistStorage },
  ),
);

export const selectComplaint = (id: string | undefined) => (s: ComplaintsState) =>
  id ? s.complaints.find((c) => c.id === id) : undefined;
