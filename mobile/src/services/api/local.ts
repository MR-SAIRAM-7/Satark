import { raiseWith } from '@satark/shared';

import { hasDirectLlm } from '@/config/env';
import { runLlmChain } from '@/services/ai/chain';
import { sarvamStt, sarvamTts } from '@/services/ai/providers';

import type { SatarkApi } from './types';

/**
 * On-device stand-in for the backend. Layers 1-2 and the Kill Chain pass have
 * already run by the time `analyze` is called; this adds the LLM layer directly
 * when a demo key is configured, and otherwise returns the on-device verdict
 * with its cached explanation. Community intelligence comes from the local
 * cache seeded in data/intel.ts.
 */
export const localApi: SatarkApi = {
  mode: 'on-device',

  async analyze(req, base) {
    if (!hasDirectLlm) return base;
    const result = await runLlmChain(req);
    return result ? raiseWith(base, result.verdict, result.engine) : base;
  },

  async tts(text, lang) {
    try {
      return await sarvamTts(text, lang);
    } catch {
      return null;
    }
  },

  async listen(fileUri) {
    try {
      return await sarvamStt(fileUri);
    } catch {
      return null;
    }
  },

  // The local IOC cache is updated by features/detection/report.ts; nothing to upload.
  async report() {},

  async syncIocs() {
    return [];
  },

  // No Twilio credentials on the phone: delivery is simulated and shown in the tracker.
  async sendWhatsApp() {
    return 'demo';
  },
};
