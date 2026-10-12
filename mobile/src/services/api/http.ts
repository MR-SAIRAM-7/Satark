import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeResponseSchema, fuseScores, verdictFor, type AnalyzeResponse } from '@satark/shared';

import { env } from '@/config/env';
import { pushTokenIfAllowed } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import type { CommunityIoc } from '@/types';

import type { CaseSync, DeliveryStatus, SatarkApi, ServerAlert } from './types';

const TIMEOUT_MS = 8000;
const DEVICE_KEY = 'satark.deviceId';

/**
 * Anonymous device session: the phone signs in with a random install id (no
 * password, no phone number required), so the backend can alert this elder's
 * guardian and file their complaints. Fetched once, refreshed on a 401.
 */
let session: Promise<string | null> | null = null;

/** Sign in again whenever who this phone is changes (role, number, family contact, place, language). */
let identity = '';
useSettings.subscribe((s) => {
  const next = [s.role, s.elder.name, s.elder.phone, s.elder.locality, s.guardian?.name, s.guardian?.phone, s.lang].join('|');
  if (next !== identity) {
    identity = next;
    session = null;
  }
});

/** Forget the session, e.g. once notification permission arrives and there is a push token to register. */
export function refreshSession(): void {
  session = null;
}

async function deviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (saved) return saved;
  const id = newId('dev');
  await AsyncStorage.setItem(DEVICE_KEY, id).catch(() => undefined);
  return id;
}

function token(): Promise<string | null> {
  session ??= (async () => {
    const { role, elder, guardian, lang } = useSettings.getState();
    // Elders: "me" is the elder and `guardian` the family contact. Guardians and Home Guardians: "me" is `guardian`.
    const me = role === 'elder' ? elder : (guardian ?? { name: '', phone: '' });
    const res = await fetch(`${env.apiBaseUrl}/auth/device`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: await deviceId(),
        role,
        name: me.name || undefined,
        phone: me.phone || undefined,
        locality: elder.locality || undefined,
        lang,
        push_token: (await pushTokenIfAllowed()) ?? undefined,
        guardian:
          role === 'elder' && guardian?.phone ? { name: guardian.name, phone: guardian.phone, relation: guardian.relation } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`/auth/device responded ${res.status}`);
    return ((await res.json()) as { token?: string }).token ?? null;
  })().catch(() => {
    session = null; // try again next time
    return null;
  });
  return session;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS, retry = true): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = await token();
    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (res.status === 401 && retry) {
      session = null;
      return request<T>(path, init, timeoutMs, false);
    }
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface RawCase {
  ref: string;
  stage: CaseSync['stage'];
  timeline?: CaseSync['timeline'];
  ack_number?: string | null;
  fir_number?: string | null;
  ackNumber?: string | null;
  firNumber?: string | null;
  messages?: CaseSync['messages'];
}

const toSync = (raw: RawCase, messages: CaseSync['messages'] = raw.messages ?? []): CaseSync => ({
  ref: raw.ref,
  stage: raw.stage,
  timeline: raw.timeline ?? [],
  ackNumber: raw.ack_number ?? raw.ackNumber ?? null,
  firNumber: raw.fir_number ?? raw.firNumber ?? null,
  messages,
});

/** Belt and braces: even a buggy or compromised server cannot lower the on-device verdict. */
function neverLower(base: AnalyzeResponse, server: AnalyzeResponse): AnalyzeResponse {
  const layer_scores = {
    rules: Math.max(base.layer_scores.rules, server.layer_scores.rules),
    killChain: Math.max(base.layer_scores.killChain, server.layer_scores.killChain),
    community: Math.max(base.layer_scores.community, server.layer_scores.community),
    ml: server.layer_scores.ml,
    ai: server.layer_scores.ai,
  };
  const score = fuseScores(layer_scores);
  return {
    ...server,
    score,
    verdict: verdictFor(score),
    stage: server.stage > base.stage ? server.stage : base.stage,
    injection_attempt: base.injection_attempt || server.injection_attempt,
    rules: base.rules.length >= server.rules.length ? base.rules : server.rules,
    layer_scores,
  };
}

/** Client for the Node.js + Express backend (`backend/`, routes under `/v1`). */
export const httpApi: SatarkApi = {
  mode: 'backend',

  async analyze(req, base) {
    try {
      const raw = await request<unknown>('/analyze', { method: 'POST', body: JSON.stringify(req) });
      const parsed = analyzeResponseSchema.safeParse(raw);
      return parsed.success ? neverLower(base, parsed.data) : base;
    } catch {
      return base; // offline: keep the on-device verdict
    }
  },

  async tts(text, lang) {
    try {
      const data = await request<{ audio?: string }>('/tts', { method: 'POST', body: JSON.stringify({ text, lang }) });
      return data.audio ?? null;
    } catch {
      return null;
    }
  },

  async translate(texts, lang) {
    try {
      const data = await request<{ texts?: (string | null)[] }>(
        '/translate',
        { method: 'POST', body: JSON.stringify({ texts, lang }) },
        30000,
      );
      return data.texts ?? null;
    } catch {
      return null;
    }
  },

  async listen(fileUri, sessionId) {
    const form = new FormData();
    form.append('audio', { uri: fileUri, name: 'chunk.wav', type: 'audio/wav' } as unknown as Blob);
    form.append('session_id', sessionId);
    try {
      return await request('/listen', { method: 'POST', body: form }, 12000);
    } catch {
      return null;
    }
  },

  async report(payload) {
    await request('/report', {
      method: 'POST',
      body: JSON.stringify({
        check_id: payload.checkId,
        scam_type: payload.scamType,
        locality: payload.locality,
        indicators: payload.indicators,
      }),
    });
  },

  async syncIocs(since) {
    const data = await request<{ iocs: CommunityIoc[] }>(`/iocs/sync?since=${since ?? 0}`);
    return data.iocs ?? [];
  },

  async sendWhatsApp(payload) {
    try {
      const data = await request<{ status?: DeliveryStatus | 'skipped' }>('/complaint/send', {
        method: 'POST',
        body: JSON.stringify({ to: payload.to, body: payload.body, media_url: payload.mediaUrl }),
      });
      // The server records instead of sending when Twilio is not configured (demo mode).
      return data.status === 'sent' ? 'sent' : data.status === 'failed' ? 'failed' : 'demo';
    } catch {
      return 'failed';
    }
  },

  async fileComplaint(filing) {
    try {
      return toSync(await request<RawCase>('/complaint', { method: 'POST', body: JSON.stringify(filing) }, 30000));
    } catch {
      return null;
    }
  },

  async updateCase(caseRef, stage, ackNumber) {
    try {
      const body = JSON.stringify({ stage, ...(ackNumber ? { ack_number: ackNumber } : {}) });
      return toSync(await request<RawCase>(`/complaints/${encodeURIComponent(caseRef)}/stage`, { method: 'POST', body }, 30000));
    } catch {
      return null;
    }
  },

  async getCase(caseRef) {
    try {
      const data = await request<{ complaint: RawCase; messages: CaseSync['messages'] }>(`/complaints/${encodeURIComponent(caseRef)}`);
      return toSync(data.complaint, data.messages);
    } catch {
      return null;
    }
  },

  async reportTransaction({ txn, at, relatedCheckId }) {
    try {
      const data = await request<{ golden_hour?: boolean; complaint?: { ref: string } }>('/txn/check', {
        method: 'POST',
        body: JSON.stringify({ txn, at, related_check_id: relatedCheckId }),
      });
      return data.golden_hour && data.complaint ? { ref: data.complaint.ref } : null;
    } catch {
      return null;
    }
  },

  async familyAlerts() {
    try {
      return (await request<{ alerts: ServerAlert[] }>('/alerts')).alerts ?? [];
    } catch {
      return null;
    }
  },

  async ackAlert(serverId) {
    await request(`/alerts/${encodeURIComponent(serverId)}/ack`, { method: 'POST' }).catch(() => undefined);
  },

  async pairingCode() {
    try {
      return (await request<{ code?: string }>('/guardian/code', { method: 'POST' })).code ?? null;
    } catch {
      return null;
    }
  },

  async linkFamily(code) {
    try {
      const data = await request<{ elder?: { name?: string } }>('/guardian/link', { method: 'POST', body: JSON.stringify({ code }) });
      return { name: data.elder?.name ?? '' };
    } catch (err) {
      return (err as Error).message.includes('404') ? 'invalid' : null;
    }
  },

  async listenText(sessionId, text, caller) {
    await request('/listen/text', { method: 'POST', body: JSON.stringify({ session_id: sessionId, text, caller }) }).catch(() => undefined);
  },

  async drillResult(drillId, passed) {
    await request('/drill/result', { method: 'POST', body: JSON.stringify({ scenario: drillId, passed }) }).catch(() => undefined);
  },

  sessionToken: () => token(),
};
