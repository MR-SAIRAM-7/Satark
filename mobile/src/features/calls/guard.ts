import { maskPhone, normalizeIndianMobile, parseSender, type Indicator } from '@satark/shared';

import { reportIndicators } from '@/features/detection/community';
import { translate } from '@/i18n';
import { hashIndicator } from '@/services/hash';
import { SatarkNative } from '@/services/native';
import { notify } from '@/services/notifications';
import { speak, stopSpeaking } from '@/services/voice';
import { useAlerts, useIntel } from '@/store/activity';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';

/** Seconds the elder has to say "It's safe" before the call is ended (F10). */
export const CUT_COUNTDOWN_SECONDS = 10;

const toIndicator = (number: string): Indicator => ({
  type: 'phone',
  value: normalizeIndianMobile(number) ?? parseSender(number).e164 ?? number,
});

/**
 * Call guard before ring (F9). In an installed build the Kotlin
 * `SatarkScreeningService` makes this decision from its own cache before the
 * JS runtime is even awake; this is the same check for the demo simulator and
 * for logging what native blocked.
 */
export async function screenIncomingCall(number: string): Promise<'blocked' | 'allowed'> {
  const hit = useIntel.getState().iocs[await hashIndicator(toIndicator(number))];
  if (!hit) return 'allowed';

  const { lang } = useSettings.getState();
  const numberMasked = maskPhone(number);
  useIntel.getState().logBlockedCall({
    at: Date.now(),
    numberMasked,
    reason: hit.origin === 'local' ? 'reported_by_you' : 'community',
    reportCount: hit.reportCount,
  });
  useAlerts.getState().push({
    kind: 'call_blocked',
    title: translate(lang, 'call.blocked.title'),
    summary: translate('en', 'call.blocked.body', { number: numberMasked }),
    score: 95,
    scamType: hit.scamType,
  });
  useUi.getState().interrupt({ kind: 'callBlocked', numberMasked, reportCount: hit.reportCount });
  notify(translate(lang, 'call.blocked.title'), translate(lang, 'call.blocked.body', { number: numberMasked }));
  return 'blocked';
}

/** Listening sessions started on this phone: their cut is handled here already. */
const localListenSessions = new Set<string>();
export const markLocalListenSession = (sessionId: string) => localListenSessions.add(sessionId);

/**
 * The Home Guardian on another phone heard stage 4+ at 85+ (the server's "CUT"
 * signal). Start the countdown here, on the elder's phone.
 */
export function onCallCut(signal: { sessionId?: string; caller?: string | null }): void {
  if (useSettings.getState().role !== 'elder') return;
  if (signal.sessionId && localListenSessions.has(signal.sessionId)) return;
  startCallCut(signal.caller || 'Unknown caller');
}

/** Stage 4+ at 85+ on a live call: red overlay, spoken warning, countdown. */
export function startCallCut(number: string, checkId?: string): void {
  const { lang } = useSettings.getState();
  useUi.getState().interrupt({ kind: 'callAlert', number, checkId });
  // System overlay on top of the dialer, for when Satark is not in the foreground.
  SatarkNative.showCallOverlay(
    translate(lang, 'call.title'),
    translate(lang, 'call.body'),
    translate(lang, 'call.safe'),
    CUT_COUNTDOWN_SECONDS,
  );
  speak(`${translate(lang, 'call.title')}. ${translate(lang, 'call.body')}`);
}

/**
 * The countdown finished (or the elder cancelled). On a cut: end the call,
 * tell the guardian and report the number so every other phone blocks it.
 * Returns false if Android refused to end the call, so the UI can fall back
 * to "press the red button".
 */
export async function finishCallCut(
  number: string,
  cut: boolean,
  checkId?: string,
  /** Set when the native overlay already tried to end the call, so it is not attempted twice. */
  endedByOverlay?: boolean,
): Promise<boolean> {
  SatarkNative.hideCallOverlay();
  stopSpeaking();
  if (!cut) return true;

  const { lang } = useSettings.getState();
  const ended = endedByOverlay ?? (await SatarkNative.endCall());
  useAlerts.getState().push({
    kind: 'call_cut',
    title: translate(lang, 'alert.call_cut'),
    summary: translate('en', 'call.ended.body'),
    score: 90,
    scamType: 'digital_arrest',
    checkId,
  });
  // A masked number (from another phone's Home Guardian) is not an identifier anyone can match: skip it.
  if (!/x/i.test(number)) await reportIndicators([toIndicator(number)], 'digital_arrest', checkId ?? '');
  speak(translate(lang, 'call.ended'));
  return ended;
}
