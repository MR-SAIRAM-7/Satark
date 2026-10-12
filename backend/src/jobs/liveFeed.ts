/**
 * Demo traffic simulator: during the pitch, a scam event every 10-25 seconds
 * from somewhere in Hyderabad, run through the real pipeline (analysis,
 * community reports, blocked calls), so the dashboard map and feed stay alive.
 * Off by default; switched on from the dashboard or with LIVE_FEED=true.
 */
import { maskIndicator, type ScamType } from '@satark/shared';

import { LOCALITIES } from '../lib/geo';
import { logger } from '../lib/logger';
import { analyzeMessage } from '../services/analysis';
import { reportIndicators, toReported } from '../services/intel';
import { publish } from '../services/realtime';
import { COMMUNITY_SEED, MESSAGES, TYPE_WEIGHTS } from '../seed/data';

let timer: NodeJS.Timeout | null = null;

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
function weighted<T>(items: [T, number][]): T {
  let r = Math.random() * items.reduce((s, [, w]) => s + w, 0);
  for (const [item, w] of items) if ((r -= w) <= 0) return item;
  return items[0]![0];
}

async function tick() {
  const locality = pick(Object.keys(LOCALITIES));
  if (Math.random() < 0.2) {
    const caller = pick(COMMUNITY_SEED.filter((s) => s.type === 'phone'));
    await publish({
      type: 'call',
      severity: 'info',
      title: `Blocked before ringing: ${maskIndicator(caller)}`,
      detail: `${caller.reports} community reports`,
      scamType: caller.scamType,
      locality,
    });
    return;
  }
  const scamType = weighted(TYPE_WEIGHTS) as ScamType;
  const message = pick(MESSAGES[scamType] ?? MESSAGES.digital_arrest!);
  const { response, local } = await analyzeMessage(
    { source: message.source, sender: message.sender, text: message.text, lang: 'en' },
    { channel: 'simulator', locality },
  );
  if (response.verdict === 'scam' && Math.random() < 0.7) {
    await reportIndicators({
      reporter: `sim:${Math.random().toString(36).slice(2, 10)}`,
      indicators: local.indicators.map(toReported),
      scamType: response.scam_type,
      locality,
      channel: 'simulator',
      maskedText: message.text,
    });
  }
}

function schedule() {
  timer = setTimeout(async () => {
    try {
      await tick();
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'live feed tick failed');
    }
    if (timer) schedule();
  }, 10_000 + Math.random() * 15_000);
}

export function startLiveFeed(): void {
  if (!timer) schedule();
}

export function stopLiveFeed(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

export const liveFeedOn = () => timer !== null;
