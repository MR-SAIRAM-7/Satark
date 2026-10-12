/**
 * Runtime configuration. Everything comes from EXPO_PUBLIC_* variables so the
 * same build can point at the mock engine, a local backend or production.
 *
 * Security note: EXPO_PUBLIC_* values are bundled into the app and can be read
 * by anyone with the APK. The provider keys below exist only so the app can be
 * demoed before the backend is up. Once `apiBaseUrl` is set, every AI and voice
 * call goes through the backend and no provider key is needed on the phone.
 */
const read = (value: string | undefined, fallback = '') => (value ?? fallback).trim();

export const env = {
  /** e.g. https://satark-api.onrender.com/v1. Empty = on-device engine + demo data. */
  apiBaseUrl: read(process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/$/, ''),

  gemini: {
    apiKey: read(process.env.EXPO_PUBLIC_GEMINI_API_KEY),
    model: read(process.env.EXPO_PUBLIC_GEMINI_MODEL, 'gemini-flash-latest'),
  },
  openRouter: {
    apiKey: read(process.env.EXPO_PUBLIC_OPENROUTER_API_KEY),
    model: read(process.env.EXPO_PUBLIC_OPENROUTER_MODEL, 'google/gemini-2.5-flash'),
  },
  sarvam: {
    apiKey: read(process.env.EXPO_PUBLIC_SARVAM_API_KEY),
    chatModel: read(process.env.EXPO_PUBLIC_SARVAM_CHAT_MODEL, 'sarvam-105b'),
    ttsModel: read(process.env.EXPO_PUBLIC_SARVAM_TTS_MODEL, 'bulbul:v3'),
    ttsSpeaker: read(process.env.EXPO_PUBLIC_SARVAM_TTS_SPEAKER, 'shubh'),
    sttModel: read(process.env.EXPO_PUBLIC_SARVAM_STT_MODEL, 'saaras:v3'),
  },

  /** Number the "forward to Satark" WhatsApp bot answers on (Twilio sandbox during the hackathon). */
  whatsappBotNumber: read(process.env.EXPO_PUBLIC_WHATSAPP_BOT_NUMBER, '+14155238886'),
} as const;

export const hasBackend = env.apiBaseUrl.length > 0;
export const hasDirectLlm = Boolean(env.gemini.apiKey || env.openRouter.apiKey || env.sarvam.apiKey);
