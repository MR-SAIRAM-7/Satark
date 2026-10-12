import {
  analyzeLocal,
  mask,
  maskPhone,
  SCAM_TYPES,
  THRESHOLDS,
  toResponse,
  TXN_ALERT_WINDOW_MIN,
  voiceLineFor,
  type AnalysisContext,
  type AnalyzeRequest,
  type LocalAnalysis,
} from '@satark/shared';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { translate } from '@/i18n';
import { api } from '@/services/api';
import { notify } from '@/services/notifications';
import { speak } from '@/services/voice';
import { useAlerts } from '@/store/activity';
import { recentHighRisk, useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import { useUi } from '@/store/ui';
import type { CheckRecord, IncomingItem } from '@/types';

import { lookupCommunity } from './community';

export interface ProcessOptions {
  /** The user asked ("Is this safe?"): always produce a verdict, even a green one. */
  userInitiated?: boolean;
  context?: AnalysisContext;
  /** Skip voice, notifications and navigation (used when loading sample history). */
  silent?: boolean;
}

/** Messages from one sender on one channel form a conversation. */
function threadIdFor(item: IncomingItem, checkId: string): string {
  const sender = item.sender?.replace(/\s+/g, '').toLowerCase();
  const automatic = item.source === 'sms' || item.source === 'whatsapp' || item.source === 'call';
  return sender && automatic ? `${item.source}:${sender}` : `single:${checkId}`;
}

/** F11: a debit soon after a scam warning starts the golden-hour flow. */
function checkTransactionAfterScam(local: LocalAnalysis, at: number): void {
  if (local.txn?.type !== 'debit') return;
  const related = recentHighRisk(TXN_ALERT_WINDOW_MIN * 60_000, at);
  if (!related) return;

  const minutesAfter = Math.max(1, Math.round((at - related.createdAt) / 60_000));
  const { lang } = useSettings.getState();
  useUi.getState().interrupt({ kind: 'txn', txn: local.txn, at, relatedCheckId: related.id, minutesAfter });
  useAlerts.getState().push({
    kind: 'money_debited',
    title: translate(lang, 'alert.money_debited'),
    summary: translate(lang, 'txn.after', { min: minutesAfter }),
    score: related.response.score,
    scamType: related.response.scam_type,
    checkId: related.id,
  });
  speak(translate(lang, 'txn.question'));
  notify(translate(lang, 'txn.title'), translate(lang, 'txn.question'), { screen: 'txn' });
}

/** Warn the elder and alert the family, according to the verdict tier. */
function react(check: CheckRecord, options: ProcessOptions): void {
  const { lang } = useSettings.getState();
  const { verdict, scam_type, score } = check.response;

  speak(voiceLineFor(verdict, scam_type, lang));
  if (verdict === 'safe') return;

  const label = SCAM_TYPES[scam_type].label;
  const title = (label as Record<string, string>)[lang] ?? label.en;

  if (verdict === 'scam') {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }
    // 70+: full-screen alert, voice warning, guardian alert. This records the alert on the
    // phone; the backend pushes the same alert to the guardian's phone over FCM.
    useAlerts.getState().push({
      kind: check.source === 'call' || check.source === 'transcript' ? 'scam_call' : 'scam_message',
      title,
      summary: check.response.explanation.en,
      score,
      scamType: scam_type,
      checkId: check.id,
    });
    notify(`${translate(lang, 'verdict.scam')} · ${title}`, translate(lang, 'verdict.scam.sub'), {
      screen: 'verdict',
      checkId: check.id,
    });
  }

  // The check screen navigates itself; automatic detections interrupt whatever is open.
  if (!options.userInitiated) useUi.getState().interrupt({ kind: 'verdict', checkId: check.id });
}

/**
 * The detection pipeline, end to end:
 *   layers 1-2 + Kill Chain on the phone -> layer 5 from the local cache ->
 *   (only if flagged) masked text to layers 3-4 -> fused verdict -> warn and alert.
 * Returns null when the item is not worth showing (most messages).
 */
export async function processIncoming(item: IncomingItem, options: ProcessOptions = {}): Promise<CheckRecord | null> {
  const started = Date.now();
  const receivedAt = item.receivedAt ?? started;
  const settings = useSettings.getState();
  if (settings.protectionPaused && !options.userInitiated) return null;

  const local = analyzeLocal({
    text: item.text,
    source: item.source,
    sender: item.sender,
    context: options.context,
  });

  if (!options.userInitiated && !options.silent) checkTransactionAfterScam(local, receivedAt);

  const community = await lookupCommunity(local.indicators);
  const flagged = local.score >= THRESHOLDS.suspicious || community.score > 0;
  if (!flagged && !options.userInitiated) return null;

  const id = newId('ck');
  const threadId = threadIdFor(item, id);
  const thread = useChecks.getState().advance({
    threadId,
    sender: item.sender ?? null,
    evidence: local.evidence,
    score: local.score,
    scamType: local.scamType,
    checkId: id,
  });
  const base = toResponse(local, { thread, community: community.score, scamType: thread.scamType });

  const maskedText = mask(local.cleaned.text);
  const request: AnalyzeRequest = {
    source: item.source,
    sender: item.sender ? maskPhone(item.sender) : null,
    text: maskedText,
    lang: settings.lang,
    thread_id: threadId,
    context: {
      on_call: options.context?.onCall,
      expecting_to_receive: options.context?.expectingToReceive,
      local_rule_score: local.ruleScore,
      local_rules: local.rules.map((r) => r.id),
    },
  };
  // Only flagged, masked text ever leaves the phone. Offline, the local verdict stands.
  const response = options.silent ? base : await api.analyze(request, base).catch(() => base);

  const check: CheckRecord = {
    id,
    createdAt: receivedAt,
    source: item.source,
    sender: item.sender ?? null,
    text: item.text,
    maskedText,
    threadId,
    response,
    indicators: local.indicators,
    txn: local.txn,
    userInitiated: Boolean(options.userInitiated),
    reported: false,
    latencyMs: Date.now() - started,
    communityHit: community.score > 0,
  };
  useChecks.getState().add(check);
  if (!options.silent) react(check, options);
  return check;
}
