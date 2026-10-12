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

/** The radar sits in the card's top-right corner, partly cut off, so it reads as a sweep rather than an icon. */
const RADAR = 196;

function Ripple({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.value),
    transform: [{ scale: 0.3 + progress.value * 0.75 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: color }, style]} />;
}

export interface ShieldStat {
  value: number;
  label: string;
  /** Colour of the number; white when not given. */
  color?: string;
}

export interface ShieldCardProps {
  state: ProtectionState;
  onPress?: () => void;
  /** What is covered right now, shown as ticks under the title. */
  checks?: { label: string; on: boolean }[];
  /** The numbers that show protection working: messages checked, scams stopped, calls blocked. */
  stats?: ShieldStat[];
}

/**
 * The home screen's hero. It says one thing in big type ("You are
 * protected"), proves it with the numbers underneath, and shows Satark at
 * work: a radar sweeping from the corner while protection is on.
 */
export function ShieldCard({ state, onPress, checks = [], stats = [] }: ShieldCardProps) {
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
    const sweep = withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false);
    first.value = sweep;
    second.value = withDelay(1600, withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false));
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
        <Glow color={look.color} size={380} opacity={0.22} style={styles.glow} />

        {/* The radar: rings, two sweeping ripples, and the shield at its centre. */}
        <View pointerEvents="none" style={styles.radar}>
          <Svg width={RADAR} height={RADAR} style={StyleSheet.absoluteFill}>
            {[0, 26, 52].map((inset) => (
              <Circle key={inset} cx={RADAR / 2} cy={RADAR / 2} r={RADAR / 2 - 1 - inset} stroke="#FFFFFF" strokeOpacity={0.07 + inset / 520} strokeWidth={1} fill="none" />
            ))}
          </Svg>
          {sweeping ? (
            <>
              <Ripple progress={first} color={look.color} />
              <Ripple progress={second} color={look.color} />
            </>
          ) : null}
          <View style={[styles.core, { backgroundColor: look.color }]}>
            <Ionicons name={look.icon} size={28} color="#06161D" />
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: look.color }]} />
          <AppText variant="overline" color="rgba(255,255,255,0.82)">
            {t(look.status)}
          </AppText>
        </View>

        <View style={styles.text}>
          <AppText variant="display" color="#FFFFFF">
            {t(look.title)}
          </AppText>
          <AppText variant="label" color="rgba(255,255,255,0.74)">
            {t(`${look.title}.sub`)}
          </AppText>
        </View>

        {checks.length > 0 ? (
          <View style={styles.checks}>
            {checks.map((check) => (
              <View key={check.label} style={styles.check}>
                <Ionicons name={check.on ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={check.on ? look.color : 'rgba(255,255,255,0.4)'} />
                <AppText variant="caption" color={check.on ? '#FFFFFF' : 'rgba(255,255,255,0.55)'} numberOfLines={1} style={styles.checkLabel}>
                  {check.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {stats.length > 0 ? (
          <View style={styles.stats}>
            {stats.map((stat, index) => (
              <View key={stat.label} style={[styles.stat, index > 0 && styles.statDivider]}>
                <AppText variant="numeral" color={stat.color ?? '#FFFFFF'} style={styles.statValue}>
                  {stat.value}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.66)" numberOfLines={2}>
                  {stat.label}
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
  card: { borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md, overflow: 'hidden' },
  glow: { top: -150, right: -150 },
  radar: { position: 'absolute', top: -44, right: -52, width: RADAR, height: RADAR, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: RADAR, height: RADAR, borderRadius: RADAR / 2, borderWidth: 2 },
  core: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  text: { gap: spacing.xs, paddingRight: 84, marginTop: spacing.xs },
  checks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkLabel: { fontWeight: '700' },
  stats: { flexDirection: 'row', marginTop: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  stat: { flex: 1, gap: 2, paddingRight: spacing.sm },
  statDivider: { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  statValue: { fontVariant: ['tabular-nums'] },
});
