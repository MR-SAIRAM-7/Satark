import type { AnalyzeResponse, FirStageId, ScamType } from '@satark/shared';

export type Severity = 'info' | 'warning' | 'critical';

export interface FeedEvent {
  id: string;
  type: 'check' | 'report' | 'case' | 'alert' | 'call' | 'escalation' | 'ioc' | 'system';
  severity: Severity;
  title: string;
  detail?: string;
  scamType: ScamType;
  locality?: string;
  geo?: { lat: number; lng: number };
  ref?: string;
  createdAt: string;
}

export interface Summary {
  checks: number;
  scams: number;
  reports: number;
  confirmedIocs: number;
  openCases: number;
  goldenHour: number;
  unacked: number;
  protectedElders: number;
  amountAtRisk: number;
  amountHeld: number;
}

export interface MapPoint {
  locality: string;
  lat: number;
  lng: number;
  count: number;
  byType: Record<string, number>;
  topType: ScamType;
}

export interface Campaign {
  id: string;
  label: string;
  scamType: ScamType;
  reportCount: number;
  localities: string[];
  iocCount: number;
  sampleText?: string;
  firstSeen: string;
  lastSeen: string;
}

export interface Indicator {
  id?: string;
  _id?: string;
  type: 'phone' | 'upi' | 'domain';
  masked: string;
  reportCount: number;
  status: 'suspected' | 'confirmed';
  scamType: ScamType;
  firstSeen: string;
  lastSeen: string;
}

export interface TimelineEvent {
  stage: FirStageId;
  at: string;
  note?: string;
  by?: string;
}

export interface Case {
  id: string;
  ref: string;
  source: string;
  scamType: ScamType;
  elder: { name?: string; phoneMasked?: string };
  guardian?: { name?: string; phoneMasked?: string; relation?: string };
  lang: string;
  locality: string;
  narrative?: string;
  summary?: string;
  suspect: { phones: string[]; upiIds: string[]; links: string[] };
  transaction?: { amount?: number; bank?: string; accountTail?: string; reference?: string; payee?: string; payeeVpa?: string; at?: number };
  evidence: { kind: string; label: string; content?: string; at: number; sha256: string }[];
  ackNumber?: string;
  firNumber?: string;
  stage: FirStageId;
  timeline: TimelineEvent[];
  priority: 'golden_hour' | 'high' | 'normal';
  goldenHourEndsAt?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxMessage {
  id: string;
  channel: 'whatsapp' | 'push' | 'email' | 'voice';
  toMasked: string;
  audience: string;
  body: string;
  mediaUrl?: string;
  /** "delivered" and "read" come from Twilio's delivery receipts. */
  status: 'sent' | 'delivered' | 'read' | 'demo' | 'failed' | 'skipped';
  /** Why a message failed, or why it went without its attachment. */
  error?: string;
  purpose?: string;
  complaint?: string;
  createdAt: string;
}

export type AnalyzeResult = AnalyzeResponse & {
  check_id: string;
  ml: { probability: number; score: number; top: { feature: string; weight: number }[]; model: string };
  community_hits: { type: string; masked: string; status: string; reportCount: number }[];
  enrichment: { domainAgeDays: Record<string, number>; safeBrowsingHits: string[] } | null;
  latency_ms: number;
};
