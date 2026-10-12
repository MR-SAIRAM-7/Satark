/**
 * The control-room alarm: a short two-tone siren from the Web Audio API (no
 * audio file to load). Browsers keep audio locked until the first click, so the
 * header shows "Enable sound" until `unlock()` has run once.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

export const soundReady = () => context()?.state === 'running';

export async function unlock(): Promise<boolean> {
  const audio = context();
  if (!audio) return false;
  try {
    await audio.resume();
  } catch {
    return false;
  }
  return audio.state === 'running';
}

export function siren(cycles = 3): void {
  const audio = context();
  if (!audio || audio.state !== 'running') return;
  const start = audio.currentTime + 0.02;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'square';
  for (let i = 0; i < cycles; i++) {
    osc.frequency.setValueAtTime(880, start + i * 0.6);
    osc.frequency.setValueAtTime(660, start + i * 0.6 + 0.3);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
  gain.gain.setValueAtTime(0.08, start + cycles * 0.6 - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + cycles * 0.6);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + cycles * 0.6 + 0.05);
}
