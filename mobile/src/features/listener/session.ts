import { analyzeLocal, shouldCutCall, type Evidence, type Stage } from '@satark/shared';

/**
 * Home Guardian (F10). Android gives call audio only to the call itself, so a
 * second phone listens on speaker. Each transcribed line is added to a rolling
 * window and the Kill Chain is re-run on it; at stage 4+ and score 85+ the
 * elder's phone is told to start the countdown.
 *
 * This module is the pure state machine. Where the lines come from (the
 * microphone through Sarvam Saaras, or the demo script) is the caller's choice.
 */

/** Seconds of conversation the Kill Chain is judged on. */
const WINDOW_MS = 60_000;

export interface TranscriptLine {
  id: number;
  at: number;
  text: string;
  /** Kill Chain stage this line contributed, if any. */
  stage: Stage;
}

export interface ListenerState {
  lines: TranscriptLine[];
  evidence: Evidence[];
  stage: Stage;
  score: number;
  cut: boolean;
}

export const EMPTY_LISTENER: ListenerState = { lines: [], evidence: [], stage: 0, score: 0, cut: false };

export function addTranscript(state: ListenerState, text: string, at = Date.now()): ListenerState {
  const clean = text.trim();
  if (!clean) return state;

  const lineStage = analyzeLocal({ text: clean, source: 'transcript', context: { onCall: true } }).stage;
  const lines = [...state.lines, { id: state.lines.length + 1, at, text: clean, stage: lineStage }];
  const recent = lines.filter((l) => at - l.at <= WINDOW_MS);

  const analysis = analyzeLocal({
    text: recent.map((l) => l.text).join('. '),
    source: 'transcript',
    context: { onCall: true },
  });

  return {
    lines,
    evidence: analysis.evidence,
    stage: analysis.stage,
    score: analysis.score,
    cut: state.cut || shouldCutCall(analysis.score, analysis.stage),
  };
}

/**
 * Demo call: a digital-arrest script in the Telugu-English mix scammers use
 * with Hyderabad seniors. Modelled on the pattern TGCSB and I4C warn about;
 * the lines are written for the demo.
 */
export const DEMO_CALL_SCRIPT: { delayMs: number; text: string }[] = [
  { delayMs: 800, text: 'Hello madam, I am calling from Mumbai Police Crime Branch.' },
  { delayMs: 2600, text: 'మీ ఆధార్ కార్డు ఒక మనీ లాండరింగ్ కేసులో ఉంది. మీ పేరు మీద అరెస్ట్ వారెంట్ వచ్చింది.' },
  { delayMs: 2800, text: 'ఈ విషయం ఎవరికీ చెప్పకండి. కాల్ కట్ చేయకండి, do not disconnect.' },
  { delayMs: 2600, text: 'To clear your name, transfer the amount to the RBI verification account immediately.' },
];
