import { useCallback, useEffect, useState } from 'react';

import { env, hasBackend } from '@/config/env';

export type ServerStatus =
  | { state: 'device' }
  | { state: 'checking' }
  | { state: 'online'; ms: number; demo: boolean; voice: boolean; ai: boolean; whatsapp: boolean }
  | { state: 'offline' };

interface HealthReport {
  ok?: boolean;
  mode?: string;
  integrations?: { sarvam?: boolean; llm?: boolean; whatsapp?: boolean };
}

/**
 * Nudge the server awake. A free-plan host sleeps after 15 quiet minutes and
 * answers its first request only after about a minute; asking at app start
 * means it is warm by the time a message needs checking. Fire and forget.
 */
export function wakeServer(): void {
  if (!hasBackend) return;
  fetch(`${env.apiBaseUrl}/health`, { signal: AbortSignal.timeout?.(90_000) }).catch(() => undefined);
}

/** Is the Satark server reachable, and which of its integrations are switched on? Allows for a server still waking up. */
export async function checkServer(timeoutMs = 30_000): Promise<ServerStatus> {
  if (!hasBackend) return { state: 'device' };
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${env.apiBaseUrl}/health`, { signal: controller.signal });
    const report = (await res.json()) as HealthReport;
    if (!res.ok || !report.ok) return { state: 'offline' };
    return {
      state: 'online',
      ms: Date.now() - started,
      demo: report.mode === 'demo',
      voice: Boolean(report.integrations?.sarvam),
      ai: Boolean(report.integrations?.llm),
      whatsapp: Boolean(report.integrations?.whatsapp),
    };
  } catch {
    return { state: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

export function useServerStatus(): { status: ServerStatus; recheck: () => void } {
  const [status, setStatus] = useState<ServerStatus>(hasBackend ? { state: 'checking' } : { state: 'device' });
  const recheck = useCallback(() => {
    if (!hasBackend) return;
    setStatus({ state: 'checking' });
    void checkServer().then(setStatus);
  }, []);
  useEffect(() => {
    let alive = true;
    if (hasBackend) void checkServer().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return { status, recheck };
}
