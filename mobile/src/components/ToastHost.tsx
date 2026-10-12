import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/store/ui';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';

const TONES = {
  info: { bg: colors.brandDeep, icon: 'information-circle' },
  safe: { bg: colors.safeDeep, icon: 'checkmark-circle' },
  warn: { bg: colors.warnDeep, icon: 'alert-circle' },
} as const;

/** Brief confirmations ("Copied", "Reported"). Mounted once at the root. */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, 3200);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  const tone = TONES[toast.tone];
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: tone.bg, bottom: insets.bottom + 96 }]}>
      <Ionicons name={tone.icon} size={22} color={colors.textOnDark} />
      <AppText variant="label" color={colors.textOnDark} style={styles.text}>
        {toast.text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 520,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    ...shadow.raised,
  },
  text: { flexShrink: 1 },
});
