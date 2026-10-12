import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { colors, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';

/** Always visible in demo mode, so nobody mistakes a practice screen for the real thing. */
export function DemoBanner() {
  const demoMode = useSettings((s) => s.demoMode);
  const t = useT();
  if (!demoMode) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="flask" size={14} color={colors.warnDeep} />
      <AppText variant="caption" color={colors.warnDeep} numberOfLines={1} style={styles.text}>
        {t('demo.banner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warnSoft,
    borderBottomWidth: 1,
    borderBottomColor: '#F4D9A6',
  },
  text: { fontWeight: '700', flexShrink: 1 },
});
