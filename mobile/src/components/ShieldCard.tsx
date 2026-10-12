import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { ProtectionState } from '@/hooks/useProtection';
import { useT } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Glow } from './ui/Glow';
import { tapFeedback, type IconName } from './ui/Button';

const LOOK: Record<ProtectionState, { color: string; icon: IconName; title: 'home.protected' | 'home.limited' | 'home.paused'; status: 'home.status.on' | 'home.status.limited' | 'home.status.off' }> = {
  protected: { color: '#3BE39A', icon: 'shield-checkmark', title: 'home.protected', status: 'home.status.on' },
  limited: { color: '#FFB547', icon: 'shield-half', title: 'home.limited', status: 'home.status.limited' },
  paused: { color: '#9AA3B5', icon: 'pause', title: 'home.paused', status: 'home.status.off' },
};

const RADAR = 108;

function Ripple({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - progress.value),
    transform: [{ scale: 0.55 + progress.value * 0.75 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: color }, style]} />;
}

export interface ShieldCardProps {
  state: ProtectionState;
  onPress?: () => void;
  /** What is covered right now, shown as ticks under the title. */
  checks?: { label: string; on: boolean }[];
}

/**
 * The home screen's hero: Satark's radar. Two ripples sweep outwards while
 * protection is on, so "Satark is watching" reads without a word.
 */
export function ShieldCard({ state, onPress, checks = [] }: ShieldCardProps) {
  const t = useT();
  const { c, shadow } = useTheme();
  const look = LOOK[state];
  const first = useSharedValue(0);
  const second = useSharedValue(0);
  // The radar only sweeps while Home is on screen: no animation running behind other screens.
  const focused = useIsFocused();
  const sweeping = focused && state !== 'paused';

  useEffect(() => {
    if (!sweeping) {
      first.value = 0;
      second.value = 0;
      return;
    }
    const sweep = withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false);
    first.value = sweep;
    second.value = withDelay(1300, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [sweeping, first, second]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(look.title)}. ${t(`${look.title}.sub`)}`}
      disabled={!onPress}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.shadowWrap, shadow.raised, pressed && { transform: [{ scale: 0.985 }] }]}>
      <LinearGradient colors={c.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Soft status glow behind the radar. */}
        <Glow color={look.color} size={340} opacity={0.3} style={styles.glow} />

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: look.color }]} />
          <AppText variant="overline" color="rgba(255,255,255,0.78)">
            {t(look.status)}
          </AppText>
        </View>

        <View style={styles.main}>
          <View style={styles.radar}>
            <Svg width={RADAR} height={RADAR} style={StyleSheet.absoluteFill}>
              <Circle cx={RADAR / 2} cy={RADAR / 2} r={RADAR / 2 - 1} stroke="rgba(255,255,255,0.10)" strokeWidth={1} fill="none" />
              <Circle cx={RADAR / 2} cy={RADAR / 2} r={RADAR / 2 - 16} stroke="rgba(255,255,255,0.14)" strokeWidth={1} fill="none" />
              <Circle cx={RADAR / 2} cy={RADAR / 2} r={RADAR / 2 - 31} stroke={look.color} strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
            </Svg>
            {sweeping ? (
              <>
                <Ripple progress={first} color={look.color} />
                <Ripple progress={second} color={look.color} />
              </>
            ) : null}
            <View style={[styles.core, { backgroundColor: look.color }]}>
              <Ionicons name={look.icon} size={30} color="#08101F" />
            </View>
          </View>

          <View style={styles.text}>
            <AppText variant="title" color="#FFFFFF">
              {t(look.title)}
            </AppText>
            <AppText variant="label" color="rgba(255,255,255,0.74)">
              {t(`${look.title}.sub`)}
            </AppText>
          </View>
        </View>

        {checks.length > 0 ? (
          <View style={styles.checks}>
            {checks.map((check) => (
              <View key={check.label} style={styles.check}>
                <Ionicons name={check.on ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={check.on ? look.color : 'rgba(255,255,255,0.45)'} />
                <AppText variant="caption" color={check.on ? '#FFFFFF' : 'rgba(255,255,255,0.55)'} numberOfLines={1}>
                  {check.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: radius.xxl },
  card: { borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.lg, overflow: 'hidden' },
  glow: { top: -90, left: -110 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  radar: { width: RADAR, height: RADAR, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: RADAR, height: RADAR, borderRadius: RADAR / 2, borderWidth: 2 },
  core: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xs },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
