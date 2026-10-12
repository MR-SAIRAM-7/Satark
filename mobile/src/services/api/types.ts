import type { AnalyzeRequest, AnalyzeResponse, IndicatorType, LangCode, ParsedTxn, ScamType } from '@satark/shared';

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
  fileComplaint(filing: CaseFiling): Promise<{ ref: string } | null>;
}
