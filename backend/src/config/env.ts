/**
 * Configuration, validated once at start-up. Every integration is optional:
 * with no keys at all the API runs in demo mode on an embedded MongoDB, the
 * rules + ML + community layers decide verdicts, and outbound WhatsApp and
 * push messages are recorded in the outbox instead of being sent.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

import { fatal } from '../lib/startup';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile) && process.env.NODE_ENV !== 'test') process.loadEnvFile(envFile);

// Complaint dates and the dashboard's hourly buckets are in Indian time, wherever the server runs.
process.env.TZ ??= 'Asia/Kolkata';

// Values typed into a hosting dashboard: "True", "yes" and "on" mean what they say.
const flag = (fallback: boolean) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(['true', 'false', '1', '0', 'yes', 'no', 'on', 'off', '']))
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : ['true', '1', 'yes', 'on'].includes(v)));
const optional = z.string().trim().optional().transform((v) => v || undefined);
/** A value pasted with its quotes ("mongodb+srv://...") still works. */
const unquoted = z
  .string()
  .trim()
  .optional()
  .transform((v) => v?.replace(/^(['"])(.*)\1$/, '$2').trim() || undefined);

const DEV_SECRET = 'satark-dev-secret-change-me-in-production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8000),
  LOG_LEVEL: z.string().trim().toLowerCase().pipe(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])).default('info'),
  /** Empty: an embedded MongoDB that persists to backend/.data (tests use a throwaway one). */
  MONGODB_URI: unquoted,
  JWT_SECRET: z.string().min(16).default(DEV_SECRET),
  HASH_SECRET: z.string().min(16).default(DEV_SECRET),
  PHONE_ENC_KEY: z.string().min(16).default(DEV_SECRET),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081,http://localhost:19006,http://127.0.0.1:3000,http://127.0.0.1:8081'),

  DEMO_MODE: flag(true),
  DEMO_OTP: z.string().regex(/^\d{6}$/).default('123456'),
  SEED_ON_START: flag(true),
  LIVE_FEED: flag(false),
  JOBS_ENABLED: flag(true),
  ENRICH_LINKS: flag(true),
  ESCALATE_AFTER_MIN: z.coerce.number().positive().default(5),

  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  OPENROUTER_API_KEY: optional,
  OPENROUTER_MODEL: z.string().default('google/gemini-2.5-flash'),
  SARVAM_API_KEY: optional,
  SARVAM_CHAT_MODEL: z.string().default('sarvam-105b'),
  SARVAM_TTS_MODEL: z.string().default('bulbul:v3'),
  SARVAM_TTS_SPEAKER: z.string().default('shubh'),
  SARVAM_STT_MODEL: z.string().default('saaras:v3'),
  SARVAM_TRANSLATE_MODEL: z.string().default('mayura:v1'),
  GOOGLE_SAFE_BROWSING_API_KEY: optional,

  TWILIO_ACCOUNT_SID: optional,
  TWILIO_AUTH_TOKEN: optional,
  TWILIO_WHATSAPP_FROM: optional,
  TWILIO_VERIFY_SERVICE_SID: optional,
  EXPO_ACCESS_TOKEN: optional,

  AWS_REGION: optional,
  AWS_ACCESS_KEY_ID: optional,
  AWS_SECRET_ACCESS_KEY: optional,
  S3_BUCKET: optional,
  /** Chrome or Edge for Complaint Kit PDFs. Found automatically on most machines. */
  CHROME_PATH: optional,
});

// A blank line in .env ("JWT_SECRET=") means "not set", so a file copied straight from
// .env.example starts in demo mode instead of failing validation on empty secrets.
const provided = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));
// On Render the service's public address is known to the platform, so it never has to be typed in.
// A localhost address copied from a laptop's .env would break PDF links and Twilio signatures there: the real one wins.
const onThisMachine = (url: string | undefined) => !url || /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(url);
if (provided.RENDER_EXTERNAL_URL && onThisMachine(provided.PUBLIC_BASE_URL)) provided.PUBLIC_BASE_URL = provided.RENDER_EXTERNAL_URL;
const parsed = schema.safeParse(provided);
if (!parsed.success) fatal(`Invalid configuration (check these environment variables):\n${z.prettifyError(parsed.error)}`);

export const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const weak = (['JWT_SECRET', 'HASH_SECRET', 'PHONE_ENC_KEY'] as const).filter((k) => env[k] === DEV_SECRET);
  if (weak.length) {
    fatal(
      `Set ${weak.join(', ')} before running in production: each a random string of 32+ characters.\n` +
        'On Render the Blueprint (render.yaml) generates them; for a service created by hand, add them under Environment.\n' +
        'Never change HASH_SECRET or PHONE_ENC_KEY afterwards: stored phone numbers depend on them.',
    );
  }
  // The embedded database downloads an 800 MB MongoDB binary and keeps its data on local disk.
  // A hosted container has neither the memory nor a disk that survives a restart.
  if (process.env.RENDER && !env.MONGODB_URI) {
    fatal('Set MONGODB_URI (MongoDB Atlas connection string) in the Render dashboard > Environment. See docs/DEPLOY.md.');
  }
  if (env.MONGODB_URI && /<[^>]*>/.test(env.MONGODB_URI)) {
    fatal('MONGODB_URI still contains a placeholder such as <db_password>. Replace it, including the < >, with the real value.');
  }
}

/** Which real integrations are switched on. Shown on /health and the dashboard. */
export const features = {
  llm: Boolean(env.GEMINI_API_KEY || env.OPENROUTER_API_KEY || env.SARVAM_API_KEY),
  gemini: Boolean(env.GEMINI_API_KEY),
  openrouter: Boolean(env.OPENROUTER_API_KEY),
  sarvam: Boolean(env.SARVAM_API_KEY),
  safeBrowsing: Boolean(env.GOOGLE_SAFE_BROWSING_API_KEY),
  whatsapp: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM),
  otp: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID),
  s3: Boolean(env.S3_BUCKET && env.AWS_REGION),
  persistentDb: Boolean(env.MONGODB_URI),
};

export const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

/**
 * What the CORS middleware and Socket.IO accept. A "*" entry allows any browser
 * origin (the API authenticates with bearer tokens, not cookies); otherwise only
 * the listed origins. Native apps send no Origin header and are unaffected.
 */
export const corsOrigin: true | string[] = allowedOrigins.includes('*') ? true : allowedOrigins;
