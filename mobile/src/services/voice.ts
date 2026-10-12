import { getLanguage, type LangCode } from '@satark/shared';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { api } from '@/services/api';
import { useSettings } from '@/store/settings';

/**
 * Voice warnings (F4). Sarvam Bulbul (through the Satark server) gives a
 * natural voice in all eleven languages; if it is slow or unreachable the
 * phone's own text-to-speech speaks instead, using an installed voice for that
 * language, so the elder always hears the warning - including fully offline.
 */

/** Bulbul must answer within this budget or the phone's voice takes over. */
const CLOUD_BUDGET_MS = 1800;

/** Which voice spoke: Sarvam's, the phone's own, or none (no voice for this language here). */
export type VoiceEngine = 'cloud' | 'device' | 'none';

let player: AudioPlayer | null = null;
let webAudio: HTMLAudioElement | null = null;
let ticket = 0;

export function stopSpeaking(): void {
  ticket++;
  Speech.stop().catch(() => undefined);
  try {
    player?.remove();
  } catch {
    // Player already released.
  }
  player = null;
  webAudio?.pause();
  webAudio = null;
}

// ---- The phone's own voices -------------------------------------------------

let voicesPromise: Promise<Speech.Voice[]> | null = null;

/** Installed voices. Browsers fill the list late (or never), so give up after a moment and ask again next time. */
function deviceVoices(): Promise<Speech.Voice[]> {
  voicesPromise ??= Promise.race([
    Speech.getAvailableVoicesAsync(),
    new Promise<Speech.Voice[]>((resolve) => setTimeout(() => resolve([]), 2500)),
  ])
    .then((voices) => {
      if (voices.length === 0) voicesPromise = null;
      return voices;
    })
    .catch(() => {
      voicesPromise = null;
      return [];
    });
  return voicesPromise;
}

/** The best installed voice for a language: an Indian, natural-sounding one when there is a choice. */
export async function deviceVoiceFor(lang: LangCode): Promise<Speech.Voice | null> {
  // Phones and browsers tag Odia "or"; Sarvam calls it "od".
  const codes = lang === 'or' ? ['or', 'od'] : [lang];
  const matches = (await deviceVoices()).filter((v) => {
    const tag = v.language.toLowerCase().replace('_', '-');
    return codes.some((code) => tag === code || tag.startsWith(`${code}-`));
  });
  if (matches.length === 0) return null;
  const score = (v: Speech.Voice) =>
    (/natural|neural|online|google|enhanced|premium/i.test(v.name) ? 2 : 0) +
    (/-in$/i.test(v.language.replace('_', '-')) ? 1 : 0) +
    (v.quality === Speech.VoiceQuality.Enhanced ? 1 : 0);
  return [...matches].sort((a, b) => score(b) - score(a))[0] ?? null;
}

async function speakOnDevice(text: string, lang: LangCode): Promise<VoiceEngine> {
  const voice = await deviceVoiceFor(lang);
  // A browser with no voice for this script would read it in an English voice, or not at all.
  if (!voice && Platform.OS === 'web') return 'none';
  Speech.speak(text, {
    language: voice?.language ?? getLanguage(lang).bcp47,
    voice: voice?.identifier,
    rate: 0.9,
    pitch: 1,
  });
  return 'device';
}

// ---- Sarvam's voice, through the server -------------------------------------

async function cloudAudio(text: string, lang: LangCode, budgetMs: number): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), budgetMs));
  const base64 = await Promise.race([api.tts(text, lang), timeout]);
  if (!base64) return null;
  if (Platform.OS === 'web') return `data:audio/wav;base64,${base64}`;
  const file = new File(Paths.cache, `satark-voice-${Date.now()}.wav`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

function play(uri: string): void {
  if (Platform.OS === 'web') {
    webAudio = new Audio(uri);
    void webAudio.play().catch(() => undefined);
    return;
  }
  player = createAudioPlayer({ uri });
  player.play();
}

export interface SpeakOptions {
  lang?: LangCode;
  /** Speak even when the user has turned voice off (used by the replay and test buttons). */
  force?: boolean;
  /** How long to wait for Sarvam before the phone's voice speaks instead. */
  budgetMs?: number;
}

export async function speak(text: string, options: SpeakOptions = {}): Promise<VoiceEngine> {
  const { voiceEnabled, lang: userLang } = useSettings.getState();
  if (!text || (!voiceEnabled && !options.force)) return 'none';
  const lang = options.lang ?? userLang;

  stopSpeaking();
  const mine = ticket;

  try {
    const uri = await cloudAudio(text, lang, options.budgetMs ?? CLOUD_BUDGET_MS);
    if (mine !== ticket) return 'none'; // a newer warning replaced this one
    if (uri) {
      play(uri);
      return 'cloud';
    }
  } catch {
    // Fall back to the phone's voice.
  }
  if (mine !== ticket) return 'none';
  return speakOnDevice(text, lang);
}
