import type { AnalyzeRequest, AnalyzeResponse, FirStageId, IndicatorType, LangCode, ParsedTxn, ScamType } from '@satark/shared';

import type { CommunityIoc } from '@/types';

export interface ReportPayload {
  checkId: string;
  scamType: ScamType;
  /** Locality only (e.g. "Kukatpally, Hyderabad"). Never an exact location. */
  locality: string;
  indicators: { type: IndicatorType; hash: string; masked: string }[];
}

export interface WhatsAppPayload {
  /** E.164 number of the elder or guardian. */
  to: string;
  body: string;
  /** Public (presigned) URL of an attachment, e.g. the Complaint Kit PDF. */
  mediaUrl?: string;
}

export type DeliveryStatus = 'sent' | 'demo' | 'failed';

/** A Complaint Kit, as filed into the cyber cell's case queue (POST /complaint). Text is masked. */
export interface CaseFiling {
  client_id: string;
  /** The checks behind the kit: lets the server fold it into a golden-hour case it already opened. */
  related_check_ids: string[];
  scam_type: ScamType;
  lang: LangCode;
  locality: string;
  channel: string;
  elder: { name: string; phone?: string };
  guardian?: { name: string; phone?: string; relation?: string } | null;
  narrative: string;
  summary: string;
  suspect: { phones: string[]; upiIds: string[]; links: string[] };
  transaction: (ParsedTxn & { at: number }) | null;
  evidence: { kind: 'message' | 'transaction' | 'call' | 'transcript'; label: string; content: string; at: number }[];
}

export interface ListenResult {
  transcript: string;
  lang?: string;
}

/** The server's view of a filed case: its stages and the messages it sent the family. */
export interface CaseSync {
  ref: string;
  stage: FirStageId;
  timeline: { stage: FirStageId; at: string; note?: string }[];
  ackNumber: string | null;
  firNumber: string | null;
  messages: {
    id: string;
    channel: 'whatsapp' | 'push' | 'email' | 'voice';
    audience: string;
    body: string;
    /** "delivered" and "read" come from Twilio's delivery receipts. */
    status: 'sent' | 'delivered' | 'read' | 'demo' | 'failed' | 'skipped';
    purpose?: string;
    createdAt: string;
  }[];
}

/** A family alert as the server sends it (Socket.IO `alert`, `GET /alerts`). */
export interface ServerAlert {
  id: string;
  kind: string;
  title?: string;
  summary?: string;
  score?: number;
  scamType?: ScamType;
  ackedAt?: string | null;
  createdAt: string;
}

/**
 * Everything the app needs from "the server". Two implementations:
 *  - HttpApi: the real Node.js backend (`/v1/...`).
 *  - LocalApi: the on-device engine plus demo data, so the app is fully usable
 *    before the backend exists and when the phone is offline.
 */
export interface SatarkApi {
  readonly mode: 'backend' | 'on-device';

  /**
   * Layers 3-5. `base` is the on-device verdict; the result may only raise it.
   * Implementations must resolve to `base` rather than throw when the network fails.
   */
  analyze(req: AnalyzeRequest, base: AnalyzeResponse): Promise<AnalyzeResponse>;

  /** Text to speech (Sarvam Bulbul). Base64 WAV, or null to use the phone's own voice. */
  tts(text: string, lang: LangCode): Promise<string | null>;

  /**
   * English -> the user's language (Sarvam Mayura). One result per input, `null`
   * for any string that could not be translated; `null` overall when unavailable.
   */
  translate(texts: string[], lang: LangCode): Promise<(string | null)[] | null>;

  /** Speech to text for one Home Guardian audio chunk. Null when unavailable. */
  listen(fileUri: string, sessionId: string): Promise<ListenResult | null>;

  /** Confirm a scam: feeds community intelligence. */
  report(payload: ReportPayload): Promise<void>;

  /** Hashed indicators confirmed by other users since the last sync. */
  syncIocs(since: number | null): Promise<CommunityIoc[]>;

  /** WhatsApp delivery through Twilio (complaint kit, FIR status updates). */
  sendWhatsApp(payload: WhatsAppPayload): Promise<DeliveryStatus>;

  /**
   * File the kit into the cyber cell's case queue, which then drives the
   * automated stage updates. Null when there is no backend or it is unreachable.
   */
  fileComplaint(filing: CaseFiling): Promise<CaseSync | null>;

  /** Stages the victim reaches (1930 called, portal filed, acknowledged); the server messages the family. */
  updateCase(caseRef: string, stage: 'helpline_1930' | 'portal_filed' | 'acknowledged', ackNumber?: string): Promise<CaseSync | null>;

  /** The case as the cyber cell sees it: picks up stages the police have set. */
  getCase(caseRef: string): Promise<CaseSync | null>;

  /** A debit soon after a scam (F11): the server opens the golden-hour case and alerts the family. */
  reportTransaction(input: { txn: ParsedTxn; at: number; relatedCheckId: string }): Promise<{ ref: string } | null>;

  /** Alerts about the people this phone looks after (guardian and Home Guardian roles). */
  familyAlerts(): Promise<ServerAlert[] | null>;

  /** Acknowledge a family alert: stops the server escalating it. */
  ackAlert(serverId: string): Promise<void>;

  /** A fresh one-time pairing code for the elder, issued by the server. Null when there is no backend or it is unreachable. */
  pairingCode(): Promise<{ code: string; expiresAt: number } | null>;

  /** Link this guardian or Home Guardian phone to an elder with their code. */
  linkFamily(code: string): Promise<{ name: string } | 'invalid' | null>;

  /** A Home Guardian transcript line, so the server can cut the call on the elder's phone. */
  listenText(sessionId: string, text: string, caller?: string): Promise<void>;

  /** Scam drill result, for the guardian's readiness score. */
  drillResult(drillId: string, passed: boolean): Promise<void>;

  /** The current session token (for the live connection), or null. */
  sessionToken(): Promise<string | null>;
}
