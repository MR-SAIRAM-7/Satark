import type {
  AnalyzeResponse,
  Evidence,
  FirStageId,
  Indicator,
  IndicatorType,
  ParsedTxn,
  ScamType,
  Source,
  Stage,
} from '@satark/shared';

export type Role = 'elder' | 'guardian' | 'listener';

/** Something that arrived on the phone and needs checking. */
export interface IncomingItem {
  source: Source;
  text: string;
  sender?: string | null;
  /** Android package the notification came from, e.g. com.whatsapp. */
  app?: string;
  receivedAt?: number;
}

/** One analysed item. Raw text stays on this phone; only `maskedText` is ever uploaded. */
export interface CheckRecord {
  id: string;
  createdAt: number;
  source: Source;
  sender: string | null;
  text: string;
  maskedText: string;
  /** Conversation this belongs to, so the Kill Chain meter can climb across messages. */
  threadId: string;
  response: AnalyzeResponse;
  indicators: Indicator[];
  txn: ParsedTxn | null;
  /** The user tapped "Is this safe?" (as opposed to automatic scanning). */
  userInitiated: boolean;
  reported: boolean;
  latencyMs: number;
  /** Matched the community blocklist. */
  communityHit: boolean;
}

export interface ConversationThread {
  id: string;
  sender: string | null;
  evidence: Evidence[];
  stage: Stage;
  score: number;
  /** What kind of scam this conversation is, once any message has made it clear. */
  scamType: ScamType;
  updatedAt: number;
  checkIds: string[];
}

/** What the guardian sees when the elder is targeted. */
export interface GuardianAlert {
  id: string;
  createdAt: number;
  kind: 'scam_message' | 'scam_call' | 'call_blocked' | 'call_cut' | 'money_debited' | 'complaint_ready';
  title: string;
  summary: string;
  score: number;
  scamType: ScamType;
  checkId?: string;
  complaintId?: string;
  read: boolean;
  /** Set for alerts that came from the server (another phone in the family). */
  serverId?: string;
}

export interface CommunityIoc {
  hash: string;
  type: IndicatorType;
  /** Masked value for display. The raw value is never stored. */
  masked: string;
  reportCount: number;
  status: 'suspected' | 'confirmed';
  scamType: ScamType;
  firstSeen: number;
  lastSeen: number;
  /** Where the indicator came from: this phone or the community feed. */
  origin: 'local' | 'community';
}

export interface BlockedCall {
  id: string;
  at: number;
  numberMasked: string;
  reason: 'community' | 'reported_by_you';
  reportCount: number;
}

export type { FirStageId };

export interface FirEvent {
  stage: FirStageId;
  at: number;
  note?: string;
}

export interface WhatsAppMessage {
  id: string;
  at: number;
  to: 'elder' | 'guardian';
  body: string;
  /** PDF or other attachment name. */
  attachment?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'demo';
}

export interface EvidenceItem {
  id: string;
  kind: 'message' | 'transaction' | 'call' | 'transcript';
  label: string;
  content: string;
  at: number;
  sha256: string;
}

export interface Complaint {
  id: string;
  createdAt: number;
  checkIds: string[];
  scamType: ScamType;
  /** Complaint text in English, following the cybercrime.gov.in sections. */
  narrative: string;
  /** Summary for the elder, in their language. */
  summary: string;
  suspect: { phones: string[]; upiIds: string[]; links: string[] };
  transaction: (ParsedTxn & { at: number }) | null;
  evidence: EvidenceItem[];
  pdfUri: string | null;
  pdfSha256: string | null;
  ackNumber: string | null;
  firNumber: string | null;
  timeline: FirEvent[];
  whatsapp: WhatsAppMessage[];
  /** WhatsApp status updates on/off for this complaint. */
  updatesEnabled: boolean;
  /** Case reference in the cyber cell's queue, once the backend has filed it. */
  caseRef?: string | null;
}

export interface DrillResult {
  id: string;
  drillId: string;
  at: number;
  correct: boolean;
}
