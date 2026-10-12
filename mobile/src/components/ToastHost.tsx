import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { useTabBarSpace } from '@/components/ui/Screen';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';

/** Brief confirmations ("Copied", "Reported"): a floating capsule. Mounted once at the root. */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const bottom = useTabBarSpace();
  const styles = useStyles();
  const { c, shadow } = useTheme();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, 3400);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  const icon = toast.tone === 'safe' ? 'checkmark-circle' : toast.tone === 'warn' ? 'alert-circle' : 'information-circle';
  const color = toast.tone === 'safe' ? c.safeText : toast.tone === 'warn' ? c.warnText : c.accentText;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutDown.duration(160)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, shadow.float, { bottom: bottom + spacing.sm }]}>
      <Ionicons name={icon} size={22} color={color} />
      <AppText variant="label" style={styles.text}>
        {toast.text}
      </AppText>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c }) => ({
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
    borderRadius: radius.pill,
    backgroundColor: c.chrome,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  text: { flexShrink: 1, fontWeight: '600' },
}));
