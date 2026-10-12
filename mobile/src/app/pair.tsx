import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { PairingCode, PairingEntry } from '@/components/PairingCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

/**
 * Pair a family phone. On the elder's phone: make a one-time code. On a
 * guardian or Home Guardian phone: type that code in.
 */
export default function PairScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const role = useSettings((s) => s.role);
  const elder = role === 'elder';

  return (
    <Screen back title={t('pair.title')} subtitle={t(elder ? 'pair.sub.elder' : 'pair.sub.family')}>
      {elder ? <PairingCode /> : <PairingEntry />}
      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={18} color={c.textMuted} />
        <AppText variant="caption" color={c.textMuted} style={styles.flex}>
          {t('pair.safety')}
        </AppText>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surface2 },
}));
