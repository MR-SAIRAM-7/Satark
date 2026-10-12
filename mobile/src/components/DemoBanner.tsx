import { View } from 'react-native';

import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { makeStyles, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';

/** Always visible in demo mode, so nobody mistakes a practice screen for the real thing. */
export function DemoBanner({ onDark }: { onDark?: boolean }) {
  const demoMode = useSettings((s) => s.demoMode);
  const t = useT();
  const { c } = useTheme();
  const styles = useStyles();
  if (!demoMode) return null;
  const color = onDark ? '#FFD38A' : c.warnText;
  return (
    <View style={[styles.banner, onDark && styles.onDark]} accessibilityRole="alert">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color={color} numberOfLines={1} style={styles.text}>
        {t('demo.banner')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    backgroundColor: c.warnSoft,
  },
  onDark: { backgroundColor: 'rgba(0,0,0,0.22)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { flexShrink: 1, letterSpacing: 0.2 },
}));
