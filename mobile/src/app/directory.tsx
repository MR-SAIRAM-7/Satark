import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { tapFeedback } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Field, IconBadge } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { DIRECTORY, type DirectoryEntry } from '@/data/directory';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { makeStyles, spacing, useTheme, type Palette } from '@/theme/tokens';

function kindLook(c: Palette, kind: DirectoryEntry['kind']): { icon: keyof typeof Ionicons.glyphMap; color: string; soft: string; fill: string } {
  switch (kind) {
    case 'emergency':
      return { icon: 'alert-circle', color: c.dangerText, soft: c.dangerSoft, fill: c.danger };
    case 'bank':
      return { icon: 'business', color: c.accentText, soft: c.accentSoft, fill: c.accent };
    case 'government':
      return { icon: 'flag', color: c.warnText, soft: c.warnSoft, fill: c.warn };
    case 'utility':
      return { icon: 'flash', color: c.safeText, soft: c.safeSoft, fill: c.safe };
  }
}

/** "Call back the real one" (F17): dial the official number, never the one the caller gave. */
export default function DirectoryScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const entries = q ? DIRECTORY.filter((e) => `${e.name} ${e.purpose} ${e.number}`.toLowerCase().includes(q)) : DIRECTORY;

  return (
    <Screen back title={t('directory.title')} subtitle={t('directory.sub')}>
      <Field value={query} onChangeText={setQuery} placeholder={t('directory.search')} autoCapitalize="none" icon="search" />
      {entries.length === 0 ? <EmptyState icon="search-outline" title={t('directory.none')} /> : null}
      <View style={styles.list}>
        {entries.map((entry) => {
          const look = kindLook(c, entry.kind);
          return (
            <Card key={entry.id} style={styles.card}>
              <View style={styles.top}>
                <IconBadge name={look.icon} color={look.color} soft={look.soft} size={44} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{entry.name}</AppText>
                  <AppText variant="label" color={c.textMuted}>
                    {entry.purpose}
                  </AppText>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('common.call')} ${entry.name} ${entry.number}`}
                onPress={() => {
                  tapFeedback();
                  dial(entry.number, { name: entry.name });
                }}
                style={({ pressed }) => [styles.call, { backgroundColor: look.fill }, pressed && styles.pressed]}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <AppText variant="heading" color="#FFFFFF" style={styles.number}>
                  {entry.number}
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(entry.website).catch(() => undefined)} style={styles.source}>
                <Ionicons name={entry.verified ? 'checkmark-circle' : 'open-outline'} size={15} color={entry.verified ? c.safeText : c.textMuted} />
                <AppText variant="caption" color={entry.verified ? c.safeText : c.textMuted} numberOfLines={1} style={styles.flex}>
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

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 56, borderRadius: 999 },
  number: { letterSpacing: 0.5 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
}));
