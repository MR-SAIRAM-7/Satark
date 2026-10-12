import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { ProtectionState } from '@/hooks/useProtection';
import { useT } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { tapFeedback } from './ui/Button';

const LOOK: Record<ProtectionState, { gradient: readonly [string, string]; icon: keyof typeof Ionicons.glyphMap; title: 'home.protected' | 'home.limited' | 'home.paused' }> = {
  protected: { gradient: ['#1A9A5B', '#0A5A32'], icon: 'shield-checkmark', title: 'home.protected' },
  limited: { gradient: ['#F0A020', '#B4580A'], icon: 'shield-half', title: 'home.limited' },
  paused: { gradient: ['#6B7890', '#3F4A5F'], icon: 'pause-circle', title: 'home.paused' },
};

/** The home screen's status hero. A slow pulse says "Satark is watching" without any text. */
export function ShieldCard({ state, onPress }: { state: ProtectionState; onPress?: () => void }) {
  const t = useT();
  const look = LOOK[state];
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = state === 'protected' ? withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false) : 0;
  }, [state, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(look.title)}. ${t(`${look.title}.sub`)}`}
      disabled={!onPress}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.shadow, pressed && { opacity: 0.92 }]}>
      <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.shieldWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <View style={styles.shield}>
            <Ionicons name={look.icon} size={40} color={look.gradient[1]} />
          </View>
        </View>
        <View style={styles.text}>
          <AppText variant="heading" color={colors.textOnDark}>
            {t(look.title)}
          </AppText>
          <AppText variant="label" color="rgba(255,255,255,0.9)">
            {t(`${look.title}.sub`)}
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.xl, ...shadow.raised },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, borderRadius: radius.xl },
  shieldWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.textOnDark },
  shield: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
