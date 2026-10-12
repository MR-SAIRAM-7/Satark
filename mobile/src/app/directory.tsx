import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, IconBadge } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { DIRECTORY, type DirectoryEntry } from '@/data/directory';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { colors, spacing } from '@/theme/tokens';

const KIND_ICON: Record<DirectoryEntry['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string; soft: string }> = {
  emergency: { icon: 'alert-circle', color: colors.danger, soft: colors.dangerSoft },
  bank: { icon: 'business', color: colors.brandBright, soft: colors.brandSoft },
  government: { icon: 'flag', color: colors.warn, soft: colors.warnSoft },
  utility: { icon: 'flash', color: colors.safe, soft: colors.safeSoft },
};

/** "Call back the real one" (F17): dial the official number, never the one the caller gave. */
export default function DirectoryScreen() {
  const t = useT();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const entries = q ? DIRECTORY.filter((e) => `${e.name} ${e.purpose} ${e.number}`.toLowerCase().includes(q)) : DIRECTORY;

  return (
    <Screen back title={t('directory.title')} subtitle={t('directory.sub')}>
      <Field value={query} onChangeText={setQuery} placeholder={t('directory.search')} autoCapitalize="none" />
      <View style={styles.list}>
        {entries.map((entry) => {
          const look = KIND_ICON[entry.kind];
          return (
            <Card key={entry.id} style={styles.card}>
              <View style={styles.top}>
                <IconBadge name={look.icon} color={look.color} soft={look.soft} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{entry.name}</AppText>
                  <AppText variant="label" color={colors.textMuted}>
                    {entry.purpose}
                  </AppText>
                </View>
              </View>
              <Button label={entry.number} icon="call" variant={entry.kind === 'emergency' ? 'danger' : 'primary'} size="lg" onPress={() => dial(entry.number, { name: entry.name })} />
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(entry.website).catch(() => undefined)} style={styles.source}>
                <Ionicons name={entry.verified ? 'checkmark-circle' : 'open-outline'} size={16} color={entry.verified ? colors.safe : colors.textMuted} />
                <AppText variant="caption" color={entry.verified ? colors.safeDeep : colors.textMuted} numberOfLines={1} style={styles.flex}>
                  {t('directory.source')}: {entry.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </AppText>
              </Pressable>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
