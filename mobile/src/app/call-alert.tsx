import Ionicons from '@expo/vector-icons/Ionicons';
import { maskPhone } from '@satark/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { DemoBanner } from '@/components/DemoBanner';
import { AppText } from '@/components/ui/AppText';
import { Button, tapFeedback } from '@/components/ui/Button';
import { goBack } from '@/components/ui/Screen';
import { CUT_COUNTDOWN_SECONDS, finishCallCut } from '@/features/calls/guard';
import { useT } from '@/i18n';
import { isNativeAvailable, SatarkNative } from '@/services/native';
import { MAX_CONTENT_WIDTH, radius, spacing } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 232;
const STROKE = 12;
const CIRCUMFERENCE = Math.PI * (RING - STROKE);

type Phase = 'countdown' | 'ended' | 'kept' | 'manual';

const GRADIENTS = {
  danger: ['#C8231B', '#5E0B07'],
  good: ['#0E9A62', '#04432B'],
  careful: ['#C97808', '#5A3200'],
} as const;

/**
 * Live call protection (F10) and the "blocked before ringing" notice (F9).
 * No call is ever cut silently: the elder sees and hears a 10-second countdown
 * and one tap on "It's safe" cancels it.
 */
export default function CallAlertScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string; checkId?: string; blocked?: string; reports?: string }>();
  const number = params.number ?? '';
  const blocked = params.blocked === '1';

  const [seconds, setSeconds] = useState(CUT_COUNTDOWN_SECONDS);
  const [phase, setPhase] = useState<Phase>('countdown');
  const settled = useRef(false);
  const progress = useSharedValue(0);

  const settle = async (cut: boolean, endedByOverlay?: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const ended = await finishCallCut(number, cut, params.checkId || undefined, endedByOverlay);
    // If Android refused to end the call, tell the elder to hang up themselves.
    setPhase(!cut ? 'kept' : ended || !isNativeAvailable ? 'ended' : 'manual');
  };

  useEffect(() => {
    if (blocked) return;
    progress.value = withTiming(1, { duration: CUT_COUNTDOWN_SECONDS * 1000, easing: Easing.linear });
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    // The native overlay shows the same countdown over the dialer; honour its button too.
    const overlay = SatarkNative.onOverlayResult(({ cut, ended }) => settle(cut, cut ? ended : undefined));
    return () => {
      clearInterval(timer);
      overlay.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  useEffect(() => {
    if (!blocked && seconds === 0) settle(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, blocked]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * progress.value }));

  const done = blocked || phase !== 'countdown';
  const good = blocked || phase === 'ended';
  const gradient = done ? (good ? GRADIENTS.good : GRADIENTS.careful) : GRADIENTS.danger;

  return (
    <LinearGradient colors={gradient} style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <DemoBanner onDark />
      <View style={styles.content}>
        {blocked ? (
          <Result
            icon="shield-checkmark"
            title={t('call.blocked.title')}
            body={t('call.blocked.body', { number })}
            note={params.reports ? t('activity.reportedTimes', { n: params.reports }) : undefined}
          />
        ) : phase === 'countdown' ? (
          <>
            <View style={styles.kicker}>
              <Ionicons name="warning" size={18} color="#FFFFFF" />
              <AppText variant="overline" color="#FFFFFF">
                {maskPhone(number)}
              </AppText>
            </View>
            <AppText variant="hero" color="#FFFFFF" center accessibilityRole="header">
              {t('call.title')}
            </AppText>
            <AppText variant="heading" color="rgba(255,255,255,0.9)" center>
              {t('call.body')}
            </AppText>

            <View style={styles.ring} accessibilityLabel={`${seconds} ${t('call.seconds')}`} accessibilityLiveRegion="assertive">
              {/* Rotated so the ring empties from 12 o'clock; a style transform works on Android and the web alike. */}
              <Svg width={RING} height={RING} style={styles.ringSvg}>
                <Circle cx={RING / 2} cy={RING / 2} r={(RING - STROKE) / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={STROKE} fill="none" />
                <AnimatedCircle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={(RING - STROKE) / 2}
                  stroke="#FFFFFF"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={ringProps}
                  fill="none"
                />
              </Svg>
              <View style={styles.ringText}>
                <AppText variant="caption" color="rgba(255,255,255,0.86)">
                  {t('call.cutting')}
                </AppText>
                <AppText variant="hero" color="#FFFFFF" style={styles.count}>
                  {seconds}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.86)">
                  {t('call.seconds')}
                </AppText>
              </View>
            </View>
          </>
        ) : phase === 'ended' ? (
          <Result icon="checkmark-circle" title={t('call.ended')} body={t('call.ended.body')} />
        ) : phase === 'manual' ? (
          <Result icon="call" title={t('call.pressRed')} body={t('call.ended.body')} />
        ) : (
          <Result icon="eye" title={t('call.kept')} />
        )}
      </View>

      <View style={styles.footer}>
        {!done ? (
          <>
            <Pressable
              testID="cut-now"
              accessibilityRole="button"
              accessibilityLabel={t('call.cutNow')}
              onPress={() => {
                tapFeedback();
                void settle(true);
              }}
              style={({ pressed }) => [styles.cutNow, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Ionicons name="call" size={22} color="#B3140D" style={styles.hangUp} />
              <AppText variant="bodyStrong" color="#B3140D">
                {t('call.cutNow')}
              </AppText>
            </Pressable>
            <Button testID="its-safe" label={t('call.safe')} icon="hand-left-outline" variant="onDark" size="lg" onPress={() => settle(false)} />
          </>
        ) : (
          <>
            {phase === 'ended' || phase === 'manual' ? (
              <Button
                label={t('call.makeComplaint')}
                icon="document-text"
                variant="onDark"
                size="lg"
                disabled={!params.checkId}
                onPress={() => router.replace({ pathname: '/complaint/[id]', params: { id: 'new', checkId: params.checkId ?? '' } })}
              />
            ) : null}
            <Button label={t('common.done')} variant="onDark" size="lg" onPress={goBack} />
          </>
        )}
      </View>
    </LinearGradient>
  );
}

function Result({ icon, title, body, note }: { icon: keyof typeof Ionicons.glyphMap; title: string; body?: string; note?: string }) {
  return (
    <>
      <Animated.View entering={ZoomIn.duration(320)} style={styles.resultIcon}>
        <Ionicons name={icon} size={64} color="#FFFFFF" />
      </Animated.View>
      <AppText variant="display" color="#FFFFFF" center accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText variant="heading" color="rgba(255,255,255,0.9)" center>
          {body}
        </AppText>
      ) : null}
      {note ? (
        <View style={styles.note}>
          <AppText variant="label" color="#FFFFFF">
            {note}
          </AppText>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.22)' },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  ringText: { position: 'absolute', alignItems: 'center' },
  count: { fontSize: 88, lineHeight: 96 },
  resultIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  note: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.22)' },
  footer: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  cutNow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 62, borderRadius: 999, backgroundColor: '#FFFFFF' },
  hangUp: { transform: [{ rotate: '135deg' }] },
});
