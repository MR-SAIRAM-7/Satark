'use client';

/**
 * Live connection to the API (Socket.IO). Feed events refresh the panels;
 * critical events sound the alarm, raise a toast and stay in the alarm banner
 * until an officer acknowledges them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { mutate } from 'swr';

import { api, session, SOCKET_URL } from './api';
import { siren, soundReady, unlock } from './alarm';
import type { FeedEvent } from './types';

interface Realtime {
  connected: boolean;
  live: FeedEvent[];
  alarms: FeedEvent[];
  acknowledgeAlarms: () => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  soundOn: boolean;
  enableSound: () => Promise<void>;
}

const RealtimeContext = createContext<Realtime | null>(null);
const MUTE_KEY = 'satark.alarm.muted';

/** Panels that change when something happens, refreshed at most every two seconds. */
const LIVE_KEYS = ['/dashboard/summary', '/dashboard/map', '/dashboard/trends', '/dashboard/campaigns', '/dashboard/indicators', '/dashboard/alerts'];

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState<FeedEvent[]>([]);
  const [alarms, setAlarms] = useState<FeedEvent[]>([]);
  const [muted, setMutedState] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const mutedRef = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MUTE_KEY) === '1';
      mutedRef.current = saved;
      setMutedState(saved);
    } catch {
      // defaults
    }
    setSoundOn(soundReady());
  }, []);

  const refresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void mutate((key) => typeof key === 'string' && LIVE_KEYS.some((k) => key.startsWith(k)));
    }, 2000);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token: session.token() }, transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('feed', (event: FeedEvent) => {
      setLive((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 150));
      refresh();
      if (event.severity === 'critical') {
        setAlarms((prev) => [event, ...prev].slice(0, 20));
        if (!mutedRef.current) siren();
        toast.error(event.title, { description: event.detail, duration: 10_000 });
      } else if ((event.type === 'case' || event.type === 'ioc') && event.severity === 'warning') {
        toast(event.title, { description: event.detail });
      }
    });
    const refreshCases = () => void mutate((key) => typeof key === 'string' && (key.startsWith('/cases') || key.startsWith('/dashboard/summary')));
    socket.on('case:new', refreshCases);
    socket.on('case:update', refreshCases);
    socket.on('outbox', () => void mutate((key) => typeof key === 'string' && (key.startsWith('/dashboard/outbox') || key.startsWith('/cases/'))));
    socket.on('alert:ack', () => void mutate((key) => typeof key === 'string' && key.startsWith('/dashboard/alerts')));
    return () => {
      socket.close();
    };
  }, [refresh]);

  const value = useMemo<Realtime>(
    () => ({
      connected,
      live,
      alarms,
      acknowledgeAlarms: () => {
        // Acknowledging an alert here also acknowledges it on the server, which stops its escalation.
        const alertIds = new Set(alarms.filter((a) => (a.type === 'alert' || a.type === 'escalation') && a.ref).map((a) => a.ref!));
        alertIds.forEach((id) => void api(`/alerts/${id}/ack`, { method: 'POST' }).catch(() => undefined));
        setAlarms([]);
      },
      muted,
      setMuted: (next) => {
        mutedRef.current = next;
        setMutedState(next);
        try {
          window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
        } catch {
          // ignore
        }
      },
      soundOn,
      enableSound: async () => {
        const ok = await unlock();
        setSoundOn(ok);
        if (ok) siren(1);
      },
    }),
    [connected, live, alarms, muted, soundOn],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): Realtime {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error('useRealtime outside RealtimeProvider');
  return value;
}
