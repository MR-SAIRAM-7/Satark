import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { registerBackgroundSync, toIncoming } from '@/background';
import { hasBackend } from '@/config/env';
import { screenIncomingCall } from '@/features/calls/guard';
import { syncCommunity } from '@/features/detection/community';
import { processIncoming } from '@/features/detection/pipeline';
import { seedCommunityIntel } from '@/features/demo/seed';
import { refreshPairingCode, syncFamilyAlerts } from '@/features/family/sync';
import { tNow } from '@/i18n';
import { refreshSession } from '@/services/api/http';
import { SatarkNative } from '@/services/native';
import { initNotifications, onNotificationTap } from '@/services/notifications';
import { connectRealtime } from '@/services/realtime';
import { ensureLanguagePack } from '@/services/translation';
import { useIntel } from '@/store/activity';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';

/**
 * Connects the running app to the phone: native notification and call events,
 * text shared from other apps, notification taps, and the foreground service.
 * Renders nothing.
 */
export function AppBridge() {
  const onboarded = useSettings((s) => s.onboarded);
  const paused = useSettings((s) => s.protectionPaused);
  const lang = useSettings((s) => s.lang);
  const role = useSettings((s) => s.role);

  // One-time start-up work.
  useEffect(() => {
    if (Object.keys(useIntel.getState().iocs).length === 0) seedCommunityIntel();
    syncCommunity();
    registerBackgroundSync();
  }, []);

  // Fetch (or top up) Sarvam's translation of the interface for the chosen language.
  useEffect(() => {
    ensureLanguagePack(lang);
  }, [lang]);

  // Foreground service and native listeners, once the user has finished onboarding.
  useEffect(() => {
    if (!onboarded) return;
    // Once notifications are allowed there is a push token: sign in again so the server has it.
    void initNotifications().then((allowed) => allowed && refreshSession());
    SatarkNative.setProtectionPaused(paused);
    if (paused) SatarkNative.stopProtectionService();
    else SatarkNative.startProtectionService(tNow('home.protected'), tNow('home.protected.sub'));
  }, [onboarded, paused, lang]);

  // With a backend: the live connection, alerts about the family, and the server's pairing code.
  useEffect(() => {
    if (!onboarded || !hasBackend) return;
    connectRealtime();
    void syncFamilyAlerts();
    void refreshPairingCode();
  }, [onboarded, role]);

  useEffect(() => {
    const handle = (event: Parameters<typeof toIncoming>[0]) => {
      const item = toIncoming(event);
      if (item) processIncoming(item);
    };
    // Anything captured while the app was closed and the headless task could not run.
    const drain = () => SatarkNative.drainPendingNotifications().forEach(handle);
    drain();

    const subs = [
      SatarkNative.onNotification(handle),
      SatarkNative.onCall((event) => {
        // Native has already rejected the call; this records it and tells the family.
        if (event.state === 'blocked') screenIncomingCall(event.number);
      }),
    ];
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      drain();
      if (hasBackend) void syncFamilyAlerts();
    });
    const stopTaps = onNotificationTap((data) => {
      if (data.screen === 'verdict' && typeof data.checkId === 'string') {
        router.push({ pathname: '/verdict/[id]', params: { id: data.checkId } });
      } else if (data.screen === 'complaint' && typeof data.complaintId === 'string') {
        router.push({ pathname: '/complaint/[id]', params: { id: data.complaintId } });
      } else if (data.screen === 'txn') {
        router.push('/txn-alert');
      }
    });
    return () => {
      subs.forEach((s) => s.remove());
      appState.remove();
      stopTaps();
    };
  }, []);

  return (
    <>
      {Platform.OS === 'web' ? null : <ShareReceiver />}
      <InterruptionRouter />
    </>
  );
}

/** "Share to Satark" from WhatsApp or any other app (F1). */
function ShareReceiver() {
  const { sharedPayloads, clearSharedPayloads } = useIncomingShare();
  useEffect(() => {
    const text = sharedPayloads
      ?.filter((p) => p.shareType === 'text' || p.shareType === 'url')
      .map((p) => p.value)
      .join('\n')
      .trim();
    if (!text) return;
    clearSharedPayloads();
    router.push({ pathname: '/check', params: { shared: text } });
  }, [sharedPayloads, clearSharedPayloads]);
  return null;
}

/** Takes over the screen when a scam is detected, whatever the user was doing. */
function InterruptionRouter() {
  const interruption = useUi((s) => s.interruption);
  const consume = useUi((s) => s.consume);
  const lastVerdict = useRef<string | null>(null);

  useEffect(() => {
    if (!interruption) return;
    consume();
    switch (interruption.kind) {
      case 'verdict':
        // A climbing conversation updates the open alert instead of stacking screens.
        if (lastVerdict.current) router.replace({ pathname: '/verdict/[id]', params: { id: interruption.checkId, alert: '1' } });
        else router.push({ pathname: '/verdict/[id]', params: { id: interruption.checkId, alert: '1' } });
        lastVerdict.current = interruption.checkId;
        setTimeout(() => (lastVerdict.current = null), 9000);
        break;
      case 'callAlert':
        router.push({ pathname: '/call-alert', params: { number: interruption.number, checkId: interruption.checkId ?? '' } });
        break;
      case 'callBlocked':
        router.push({
          pathname: '/call-alert',
          params: { blocked: '1', number: interruption.numberMasked, reports: String(interruption.reportCount) },
        });
        break;
      case 'txn':
        router.push('/txn-alert');
        break;
    }
  }, [interruption, consume]);

  return null;
}
