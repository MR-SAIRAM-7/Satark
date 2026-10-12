import Ionicons from '@expo/vector-icons/Ionicons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { KillChainMeter } from '@/components/KillChainMeter';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { goBack, Screen } from '@/components/ui/Screen';
import { startCallCut } from '@/features/calls/guard';
import { SCAMMER_NUMBER } from '@/features/demo/scenarios';
import { processIncoming } from '@/features/detection/pipeline';
import { addTranscript, DEMO_CALL_SCRIPT, EMPTY_LISTENER, type ListenerState } from '@/features/listener/session';
import { useT } from '@/i18n';
import { api } from '@/services/api';
import { useSettings } from '@/store/settings';
import { newId } from '@/store/storage';
import { colors, radius, spacing, verdictPalette } from '@/theme/tokens';
import { clockTime } from '@/utils/time';

/** Length of each audio chunk sent for transcription. */
const CHUNK_MS = 5000;

/**
 * Home Guardian (F10): a second phone that listens to a call on speaker.
 * Audio is recorded in 5-second chunks, transcribed, and discarded; nothing is
 * stored. "Satark is listening" stays on screen the whole time.
 */
export default function ListenerScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ demo?: string; number?: string }>();
  const role = useSettings((s) => s.role);
  const [state, setState] = useState<ListenerState>(EMPTY_LISTENER);
  const [mode, setMode] = useState<'idle' | 'mic' | 'demo'>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const micLoop = useRef(false);
  const cutSent = useRef(false);
  const [sessionId] = useState(() => newId('hg'));
  const pulse = useSharedValue(0);

  const listening = mode !== 'idle';
  const number = params.number || SCAMMER_NUMBER;

  useEffect(() => {
    pulse.value = listening ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false) : 0;
  }, [listening, pulse]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.8 }] }));

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    micLoop.current = false;
    if (recorder.isRecording) recorder.stop().catch(() => undefined);
    setMode('idle');
  };

  const playDemo = () => {
    stop();
    cutSent.current = false;
    setState(EMPTY_LISTENER);
    setMode('demo');
    let at = 0;
    DEMO_CALL_SCRIPT.forEach((line, index) => {
      at += line.delayMs;
      timers.current.push(
        setTimeout(() => {
          setState((s) => addTranscript(s, line.text));
          if (index === DEMO_CALL_SCRIPT.length - 1) setMode('idle');
        }, at),
      );
    });
  };

  /** Record a chunk, transcribe it, discard the audio, repeat. */
  const startMic = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    cutSent.current = false;
    setState(EMPTY_LISTENER);
    setMode('mic');
    micLoop.current = true;

    while (micLoop.current) {
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        await new Promise((resolve) => setTimeout(resolve, CHUNK_MS));
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) continue;
        const result = await api.listen(uri, sessionId);
        if (result?.transcript) setState((s) => addTranscript(s, result.transcript));
      } catch {
        micLoop.current = false;
        setMode('idle');
      }
    }
  };

  // Stage 4+ at 85+: keep the flagged lines as evidence, then tell the elder's phone to start the countdown.
  useEffect(() => {
    if (!state.cut || cutSent.current) return;
    cutSent.current = true;
    const text = state.lines.map((l) => l.text).join('\n');
    processIncoming({ source: 'transcript', sender: number, text }, { userInitiated: true, silent: true, context: { onCall: true } })
      .catch(() => null)
      .then((check) => {
        timers.current.push(setTimeout(() => startCallCut(number, check?.id), 700));
      });
  }, [state.cut, state.lines, number]);

  useEffect(() => {
    const autoplay = params.demo === '1' ? setTimeout(playDemo, 0) : undefined;
    return () => {
      clearTimeout(autoplay);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.demo]);

  const tone = state.score >= 70 ? verdictPalette.scam : state.score >= 40 ? verdictPalette.suspicious : verdictPalette.safe;

  return (
    <Screen
      back={role === 'listener' ? undefined : goBack}
      title={t('listener.title')}
      footer={
        listening ? (
          <Button label={t('listener.stop')} icon="stop-circle" variant="danger" size="lg" onPress={stop} />
        ) : (
          <>
            {Platform.OS === 'web' ? null : <Button label={t('listener.start')} icon="mic" size="lg" onPress={startMic} />}
            <Button testID="listener-demo" label={t('listener.demo')} icon="play-circle" variant="secondary" size="lg" onPress={playDemo} />
          </>
        )
      }>
      <Card style={styles.status} tone={listening ? { main: tone.main, soft: tone.soft } : undefined}>
        <View style={styles.micWrap}>
          {listening ? <Animated.View style={[styles.micRing, { backgroundColor: tone.main }, ringStyle]} /> : null}
          <View style={[styles.mic, { backgroundColor: listening ? tone.main : colors.surfaceAlt }]}>
            <Ionicons name={listening ? 'mic' : 'mic-off'} size={34} color={listening ? colors.textOnDark : colors.textFaint} />
          </View>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" color={listening ? tone.deep : colors.text}>
            {listening ? t('listener.listening') : t('listener.idle')}
          </AppText>
          <AppText variant="label" color={colors.textMuted}>
            {t('listener.privacy')}
          </AppText>
        </View>
      </Card>

      {state.cut ? (
        <Card tone={{ main: colors.danger, soft: colors.dangerSoft }} style={styles.cut}>
            <Ionicons name="cut" size={26} color={colors.danger} />
            <AppText variant="bodyStrong" color={colors.dangerDeep} style={styles.flex}>
              {t('listener.cut')}
            </AppText>
        </Card>
      ) : null}

      <Card style={styles.section}>
        <View style={styles.meterTop}>
          <AppText variant="heading" style={styles.flex}>
            {t('verdict.killchain')}
          </AppText>
          <View style={[styles.scorePill, { backgroundColor: tone.soft }]}>
            <AppText variant="label" color={tone.deep}>
              {t('verdict.risk', { score: state.score })}
            </AppText>
          </View>
        </View>
        <KillChainMeter stage={state.stage} evidence={state.evidence} tone={tone.main} />
      </Card>

      {state.lines.length > 0 ? (
        <Card style={styles.section}>
          <AppText variant="heading">{t('listener.transcript')}</AppText>
          {state.lines.map((line) => (
            <Animated.View key={line.id} entering={FadeInDown.duration(260)} style={styles.line}>
              <AppText variant="caption" color={colors.textFaint} style={styles.lineTime}>
                {clockTime(line.at)}
              </AppText>
              <View style={[styles.bubble, line.stage >= 3 && { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                <AppText variant="body">{line.text}</AppText>
              </View>
            </Animated.View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  micWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  mic: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  cut: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { gap: spacing.md },
  meterTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scorePill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  line: { gap: 2 },
  lineTime: { marginLeft: spacing.xs },
  bubble: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
