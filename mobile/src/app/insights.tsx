import Ionicons from '@expo/vector-icons/Ionicons';
import { SCAM_TYPES, type ScamType } from '@satark/shared';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconBadge, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { sourceById, SOURCES, STATS } from '@/data/sources';
import { useLocalized, useT } from '@/i18n';
import { useIntel } from '@/store/activity';
import { colors, spacing } from '@/theme/tokens';

const open = (url: string) => Linking.openURL(url).catch(() => undefined);

/** Scam radar: sourced figures, and what this phone's community blocklist is stopping. */
export default function InsightsScreen() {
  const t = useT();
  const localized = useLocalized();
  const iocs = useIntel((s) => s.iocs);
  const all = Object.values(iocs);

  // Reports per scam type from the community blocklist on this phone.
  const byType = new Map<ScamType, number>();
  for (const ioc of all) byType.set(ioc.scamType, (byType.get(ioc.scamType) ?? 0) + ioc.reportCount);
  const trending = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = trending[0]?.[1] ?? 1;

  return (
    <Screen back title={t('insights.title')} subtitle={t('learn.radar.sub')}>
      <Card style={styles.community} tone={{ main: colors.safe, soft: colors.safeSoft }}>
        <IconBadge name="people" color={colors.safe} soft={colors.surface} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={colors.safeDeep}>
            {t('insights.community')}
          </AppText>
          <AppText variant="label" color={colors.textMuted}>
            {t('insights.iocs', { n: all.length })}
          </AppText>
        </View>
      </Card>

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
                  <AppText variant="label" color={colors.textMuted}>
                    {t('activity.reportedTimes', { n: count })}
                  </AppText>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(8, (count / max) * 100)}%` }]} />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('insights.numbers')} />
      <View style={styles.list}>
        {STATS.map((stat) => {
          const source = sourceById(stat.sourceId);
          return (
            <Card key={stat.value + stat.scope} style={styles.stat} onPress={source ? () => open(source.url) : undefined}>
              <AppText variant="title" color={colors.danger}>
                {stat.value}
              </AppText>
              <AppText variant="body">{localized(stat.label)}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {stat.scope}
                {source ? ` · ${source.publisher}` : ''}
              </AppText>
            </Card>
          );
        })}
      </View>

      <SectionHeader title={t('insights.sources')} />
      <Card padded={false}>
        {SOURCES.map((source, index) => (
          <Pressable
            key={source.id}
            accessibilityRole="link"
            onPress={() => open(source.url)}
            style={({ pressed }) => [styles.source, index < SOURCES.length - 1 && styles.sourceDivider, pressed && { opacity: 0.7 }]}>
            <View style={styles.flex}>
              <AppText variant="label">{source.title}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {source.publisher}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  community: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { gap: spacing.lg },
  bar: { gap: spacing.xs },
  barTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.danger },
  list: { gap: spacing.md },
  stat: { gap: 2 },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  sourceDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
