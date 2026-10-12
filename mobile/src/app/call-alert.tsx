import Ionicons from '@expo/vector-icons/Ionicons';
import { maskPhone } from '@satark/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { DemoBanner } from '@/components/DemoBanner';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { goBack } from '@/components/ui/Screen';
import { CUT_COUNTDOWN_SECONDS, finishCallCut } from '@/features/calls/guard';
import { useT } from '@/i18n';
import { isNativeAvailable, SatarkNative } from '@/services/native';
import { colors, MAX_CONTENT_WIDTH, radius, spacing } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 220;
const STROKE = 14;
const CIRCUMFERENCE = Math.PI * (RING - STROKE);

type Phase = 'countdown' | 'ended' | 'kept' | 'manual';

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

  const settle = async (cut: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const ended = await finishCallCut(number, cut, params.checkId || undefined);
    // If Android refused to end the call, tell the elder to hang up themselves.
    setPhase(!cut ? 'kept' : ended || !isNativeAvailable ? 'ended' : 'manual');
  };

  useEffect(() => {
    if (blocked) return;
    progress.value = withTiming(1, { duration: CUT_COUNTDOWN_SECONDS * 1000, easing: Easing.linear });
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    // The native overlay shows the same countdown over the dialer; honour its button too.
    const overlay = SatarkNative.onOverlayResult(({ cut }) => settle(cut));
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
  const gradient = done ? (good ? (['#17A05C', '#0A5A32'] as const) : (['#F0A020', '#B4580A'] as const)) : (['#E03131', '#7A0C0C'] as const);

  return (
    <LinearGradient colors={gradient} style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <DemoBanner />
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
            <Ionicons name="warning" size={56} color={colors.textOnDark} />
            <AppText variant="display" color={colors.textOnDark} center style={styles.title} accessibilityRole="header">
              {t('call.title')}
            </AppText>
            <AppText variant="heading" color="rgba(255,255,255,0.95)" center>
              {t('call.body')}
            </AppText>
            <AppText variant="label" color="rgba(255,255,255,0.85)" center>
              {maskPhone(number)}
            </AppText>

            <View style={styles.ring} accessibilityLabel={`${seconds} ${t('call.seconds')}`} accessibilityLiveRegion="assertive">
              <Svg width={RING} height={RING}>
                <Circle cx={RING / 2} cy={RING / 2} r={(RING - STROKE) / 2} stroke="rgba(255,255,255,0.25)" strokeWidth={STROKE} fill="none" />
                <AnimatedCircle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={(RING - STROKE) / 2}
                  stroke={colors.textOnDark}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={ringProps}
                  fill="none"
                  rotation={-90}
                  origin={`${RING / 2}, ${RING / 2}`}
                />
              </Svg>
              <View style={styles.ringText}>
                <AppText variant="display" color={colors.textOnDark} style={styles.count}>
                  {seconds}
                </AppText>
                <AppText variant="label" color="rgba(255,255,255,0.9)">
                  {t('call.seconds')}
                </AppText>
              </View>
            </View>
            <AppText variant="bodyStrong" color={colors.textOnDark} center>
              {t('call.cutting')}
            </AppText>
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
            <Button testID="its-safe" label={t('call.safe')} icon="hand-left" variant="onDark" size="lg" onPress={() => settle(false)} />
            <Button label={t('call.cutNow')} icon="close-circle" variant="onDark" onPress={() => settle(true)} />
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
      <View style={styles.resultIcon}>
        <Ionicons name={icon} size={72} color={colors.safe} />
      </View>
      <AppText variant="display" color={colors.textOnDark} center accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText variant="heading" color="rgba(255,255,255,0.95)" center>
          {body}
        </AppText>
      ) : null}
      {note ? (
        <View style={styles.note}>
          <AppText variant="label" color={colors.textOnDark}>
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
  title: { fontSize: 42, lineHeight: 54, letterSpacing: 1 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  ringText: { position: 'absolute', alignItems: 'center' },
  count: { fontSize: 84, lineHeight: 92 },
  resultIcon: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  note: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.22)' },
  footer: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
});
