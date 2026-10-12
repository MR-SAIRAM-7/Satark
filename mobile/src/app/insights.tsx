import Ionicons from '@expo/vector-icons/Ionicons';
import { SCAM_TYPES, type ScamType } from '@satark/shared';
import { Linking, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Meter, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { sourceById, SOURCES, STATS } from '@/data/sources';
import { useLocalized, useT } from '@/i18n';
import { useIntel } from '@/store/activity';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

const open = (url: string) => Linking.openURL(url).catch(() => undefined);

/** Scam radar: sourced figures, and what this phone's community blocklist is stopping. */
export default function InsightsScreen() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c } = useTheme();
  const iocs = useIntel((s) => s.iocs);
  const all = Object.values(iocs);

  // Reports per scam type from the community blocklist on this phone.
  const byType = new Map<ScamType, number>();
  for (const ioc of all) byType.set(ioc.scamType, (byType.get(ioc.scamType) ?? 0) + ioc.reportCount);
  const trending = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = trending[0]?.[1] ?? 1;

  return (
    <Screen back title={t('insights.title')} subtitle={t('learn.radar.sub')}>
      <View style={styles.community}>
        <View style={styles.communityIcon}>
          <Ionicons name="people" size={24} color={c.safeText} />
        </View>
        <View style={styles.flex}>
          <AppText variant="numeral" color={c.safeText}>
            {all.length}
          </AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('insights.iocs', { n: all.length })}
          </AppText>
        </View>
      </View>

      {trending.length > 0 ? (
        <>
          <SectionHeader title={t('insights.trending')} />
          <Card style={styles.section}>
            {trending.map(([type, count]) => (
              <View key={type} style={styles.bar}>
                <View style={styles.barTop}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {localized(SCAM_TYPES[type].label)}
                  </AppText>
                  <AppText variant="label" color={c.textMuted}>
                    {count}
                  </AppText>
                </View>
                <Meter value={Math.max(8, (count / max) * 100)} color={c.danger} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('insights.numbers')} />
      <View style={styles.stats}>
        {STATS.map((stat) => {
          const source = sourceById(stat.sourceId);
          return (
            <Card key={stat.value + stat.scope} style={styles.stat} onPress={source ? () => open(source.url) : undefined}>
              <AppText variant="display" color={c.dangerText}>
                {stat.value}
              </AppText>
              <AppText variant="body">{localized(stat.label)}</AppText>
              <AppText variant="caption" color={c.textMuted}>
                {stat.scope}
                {source ? ` · ${source.publisher}` : ''}
              </AppText>
            </Card>
          );
        })}
      </View>

      <SectionHeader title={t('insights.sources')} />
      <Card padded={false} style={styles.clip}>
        {SOURCES.map((source, index) => (
          <Pressable
            key={source.id}
            accessibilityRole="link"
            onPress={() => open(source.url)}
            style={({ pressed }) => [styles.source, index < SOURCES.length - 1 && styles.divider, pressed && { backgroundColor: c.surface2 }]}>
            <View style={styles.flex}>
              <AppText variant="label">{source.title}</AppText>
              <AppText variant="caption" color={c.textMuted}>
                {source.publisher}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={18} color={c.textFaint} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  community: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: c.safeSoft },
  communityIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.lg },
  bar: { gap: spacing.xs + 2 },
  barTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stats: { gap: spacing.md },
  stat: { gap: 2 },
  clip: { overflow: 'hidden' },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
}));
