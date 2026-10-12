/**
 * Home Guardian (F10). A second phone listens to the call on speaker and sends
 * 5-second chunks (or text lines in the demo). Each line joins a rolling
 * 60-second window; at stage 4+ and score 85+ the elder's phone gets the
 * "CUT" signal and starts the 10-second countdown. Audio is never stored.
 */
import {
  analyzeLocal,
  maskPhone,
  normalizeIndianMobile,
  parseSender,
  SCAM_TYPES,
  shouldCutCall,
  type Evidence,
  type ScamType,
  type Stage,
} from '@satark/shared';
import { LRUCache } from 'lru-cache';

import { GuardianLink, User } from '../db/models';
import type { AuthUser } from '../middleware/auth';
import { raiseAlert } from './alerts';
import { reportIndicators, toReported } from './intel';
import { emitToUser, publish } from './realtime';

const WINDOW_MS = 60_000;

interface Line {
  at: number;
  text: string;
  stage: Stage;
}

export interface ListenState {
  /** The account (Home Guardian phone) that started the session. */
  owner?: string;
  lines: Line[];
  evidence: Evidence[];
  stage: Stage;
  score: number;
  cut: boolean;
  scamType: string;
}

const sessions = new LRUCache<string, ListenState>({ max: 2000, ttl: 2 * 60 * 60 * 1000 });

export async function addLine(sessionId: string, text: string, listener?: AuthUser, caller?: string): Promise<ListenState> {
  const state = sessions.get(sessionId) ?? { owner: listener?.id, lines: [], evidence: [], stage: 0, score: 0, cut: false, scamType: 'unknown' };
  const clean = text.trim();
  if (!clean) return state;

  const at = Date.now();
  const lineStage = analyzeLocal({ text: clean, source: 'transcript', context: { onCall: true } }).stage;
  const lines = [...state.lines, { at, text: clean, stage: lineStage }].slice(-40);
  const window = lines.filter((l) => at - l.at <= WINDOW_MS);
  const analysis = analyzeLocal({ text: window.map((l) => l.text).join('. '), source: 'transcript', sender: caller, context: { onCall: true } });

  const next: ListenState = {
    owner: state.owner,
    lines,
    evidence: analysis.evidence,
    stage: analysis.stage,
    score: analysis.score,
    cut: state.cut || shouldCutCall(analysis.score, analysis.stage),
    scamType: analysis.scamType,
  };
  sessions.set(sessionId, next);

  if (next.cut && !state.cut) await signalCut(sessionId, next, listener, caller);
  return next;
}

/** Tell the elder's phone to start the countdown, alert the family and the cyber cell. */
async function signalCut(sessionId: string, state: ListenState, listener?: AuthUser, caller?: string) {
  // The elders this Home Guardian phone protects; an elder listening on their own phone protects themselves.
  const links = listener && listener.role !== 'elder' ? await GuardianLink.find({ guardian: listener.id }).lean() : [];
  const ids = listener?.role === 'elder' ? [listener.id] : links.map((l) => l.elder);
  const elders = await User.find({ _id: { $in: ids } }).lean();
  const payload = { sessionId, stage: state.stage, score: state.score, countdown: 10, evidence: state.evidence, caller: caller ? maskPhone(caller) : null };
  for (const elder of elders) emitToUser(elder._id, 'cut', payload);

  const label = SCAM_TYPES[state.scamType as keyof typeof SCAM_TYPES]?.label.en ?? 'Scam call';
  const elder = elders[0];
  await raiseAlert({
    elderId: elder?._id,
    kind: 'scam_call',
    severity: 'critical',
    title: `Live scam call: ${label}`,
    summary: `Home Guardian heard stage ${state.stage} (${state.evidence.map((e) => `"${e.quote}"`).slice(-2).join(', ')}). The call-cut countdown has started.`,
    score: state.score,
    scamType: state.scamType,
    locality: elder?.locality,
  });
  // The Home Guardian phone heard the real number: report it, so every Satark phone blocks it before it rings.
  const number = caller ? (normalizeIndianMobile(caller) ?? parseSender(caller).e164) : undefined;
  if (number && listener) {
    await reportIndicators({
      reporter: listener.id,
      userId: listener.id,
      indicators: [toReported({ type: 'phone', value: number })],
      scamType: state.scamType as ScamType,
      locality: elder?.locality,
      channel: 'listener',
    });
  }
  await publish({
    type: 'call',
    severity: 'critical',
    title: `Call cut countdown${caller ? ` · ${maskPhone(caller)}` : ''}`,
    detail: `Score ${state.score}, Kill Chain stage ${state.stage}`,
    scamType: state.scamType,
    locality: elder?.locality,
  });
}

export const getSession = (sessionId: string) => sessions.get(sessionId) ?? null;
