import { analyzeResponseSchema, fuseScores, verdictFor, type AnalyzeResponse } from '@satark/shared';

import { env } from '@/config/env';
import type { CommunityIoc } from '@/types';

import type { SatarkApi } from './types';

const TIMEOUT_MS = 8000;

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

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

/** Client for the Node.js + Express backend described in the README (`/v1`). */
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
      await request('/complaint/send', {
        method: 'POST',
        body: JSON.stringify({ to: payload.to, body: payload.body, media_url: payload.mediaUrl }),
      });
      return 'sent';
    } catch {
      return 'failed';
    }
  },
};
