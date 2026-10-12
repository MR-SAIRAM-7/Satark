import { getLanguage, type LangCode } from '@satark/shared';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { api } from '@/services/api';
import { useSettings } from '@/store/settings';

/**
 * Voice warnings (F4). Sarvam Bulbul gives a natural Telugu or Hindi voice;
 * if it is slow or unreachable the phone's own text-to-speech speaks instead,
 * so the elder always hears the warning - including fully offline.
 */

/** Bulbul must answer within this budget or the phone's voice takes over. */
const CLOUD_BUDGET_MS = 1800;

let player: AudioPlayer | null = null;
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
}

function speakOnDevice(text: string, lang: LangCode): void {
  Speech.speak(text, { language: getLanguage(lang).bcp47, rate: 0.9, pitch: 1 });
}

async function fetchCloudAudio(text: string, lang: LangCode): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), CLOUD_BUDGET_MS));
  const base64 = await Promise.race([api.tts(text, lang), timeout]);
  if (!base64) return null;
  const file = new File(Paths.cache, `satark-voice-${Date.now()}.wav`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

export interface SpeakOptions {
  lang?: LangCode;
  /** Speak even when the user has turned voice off (used by the replay button). */
  force?: boolean;
}

export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const { voiceEnabled, lang: userLang } = useSettings.getState();
  if (!text || (!voiceEnabled && !options.force)) return;
  const lang = options.lang ?? userLang;

  stopSpeaking();
  const mine = ticket;

  try {
    const uri = await fetchCloudAudio(text, lang);
    if (mine !== ticket) return; // a newer warning replaced this one
    if (uri) {
      player = createAudioPlayer({ uri });
      player.play();
      return;
    }
  } catch {
    // Fall back to the phone's voice.
  }
  if (mine === ticket) speakOnDevice(text, lang);
}
