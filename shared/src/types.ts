import type { LangCode } from './languages';

export type Verdict = 'safe' | 'suspicious' | 'scam';

/** 0 = no Kill Chain evidence yet; 1-5 follow the Scam Kill Chain. */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5;

export type Source =
  | 'sms'
  | 'whatsapp'
  | 'share'
  | 'paste'
  | 'forward'
  | 'call'
  | 'transcript'
  | 'link'
  | 'qr';

export type ScamType =
  | 'digital_arrest'
  | 'kyc_bank'
  | 'investment'
  | 'electricity'
  | 'courier'
  | 'lottery'
  | 'job_task'
  | 'upi_collect'
  | 'malware_apk'
  | 'remote_access'
  | 'family_emergency'
  | 'sim_block'
  | 'phishing_link'
  | 'unknown';

export type Tactic =
  | 'authority'
  | 'fear'
  | 'urgency'
  | 'secrecy'
  | 'greed'
  | 'impersonation'
  | 'remote_access'
  | 'credential_theft';

/** Text in the three fully supported languages, optionally more (server-translated). */
export type Localized = { en: string; hi: string; te: string } & Partial<Record<LangCode, string>>;

export interface Evidence {
  stage: Stage;
  quote: string;
}

export interface RuleHit {
  id: string;
  points: number;
  /** The exact fragment that triggered the rule, when there is one. */
  match?: string;
}

export type IndicatorType = 'phone' | 'upi' | 'domain';

export interface Indicator {
  type: IndicatorType;
  /** Normalised value. Hashed before it is stored or leaves the phone. */
  value: string;
}

/** Signals only the device or the server can know, passed alongside the text. */
export interface AnalysisContext {
  onCall?: boolean;
  /** The user is expecting to receive money (refund, sale, prize). */
  expectingToReceive?: boolean;
  /** What a caller claimed to be, e.g. "bank". Set by call screening or the transcript. */
  claimedIdentity?: 'bank' | 'police' | 'government' | 'courier' | 'family' | null;
  /** Server-side enrichments (layers 3-5). */
  domainAgeDays?: Record<string, number>;
  safeBrowsingHits?: string[];
  /** Apps seen in notifications during this call, by Android package name. */
  activeApps?: string[];
}

export interface LocalInput {
  text: string;
  source: Source;
  sender?: string | null;
  context?: AnalysisContext;
}

export interface LayerScores {
  rules: number;
  killChain: number;
  community: number;
  /** Server-only layers. `null` means the layer did not run (offline, or not needed). */
  ml: number | null;
  ai: number | null;
}
