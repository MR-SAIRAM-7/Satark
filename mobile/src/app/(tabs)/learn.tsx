import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { speak } from '@/services/voice';
import { readinessScore, useDrills } from '@/store/activity';
import { colors, radius, spacing } from '@/theme/tokens';

const RULES: StringKey[] = ['learn.rule.1', 'learn.rule.2', 'learn.rule.3', 'learn.rule.4', 'learn.rule.5'];

/** Prevention: practise on safe examples, know the rules, know who to call. */
export default function LearnTab() {
  const t = useT();
  const readiness = readinessScore(useDrills((s) => s.results));

  return (
    <Screen inTabs title={t('learn.title')}>
      <Card style={styles.drill}>
        <View style={styles.drillTop}>
          <View style={styles.flex}>
            <AppText variant="heading">{t('learn.drills')}</AppText>
            <AppText variant="label" color={colors.textMuted}>
              {t('learn.drills.sub')}
            </AppText>
          </View>
          {readiness !== null ? (
            <View style={styles.score}>
              <AppText variant="heading" color={colors.safeDeep}>
                {readiness}%
              </AppText>
            </View>
          ) : null}
        </View>
        <Button label={t('learn.drills')} icon="play-circle" size="lg" onPress={() => router.push('/drill')} />
      </Card>

      <Card padded={false}>
        <ListRow
          icon="call"
          title={t('learn.directory')}
          subtitle={t('learn.directory.sub')}
          tone={{ color: colors.safe, soft: colors.safeSoft }}
          onPress={() => router.push('/directory')}
        />
        <ListRow
          icon="radio"
          title={t('learn.radar')}
          subtitle={t('learn.radar.sub')}
          tone={{ color: colors.danger, soft: colors.dangerSoft }}
          onPress={() => router.push('/insights')}
          last
        />
      </Card>

      <SectionHeader title={t('learn.rules')} />
      <Card style={styles.rules}>
        {RULES.map((key, index) => (
          <View key={key} style={styles.rule}>
            <View style={styles.ruleNumber}>
              <AppText variant="bodyStrong" color={colors.textOnDark}>
                {index + 1}
              </AppText>
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(key)}
            </AppText>
          </View>
        ))}
        <Button
          label={t('verdict.listen')}
          icon="volume-high"
          variant="secondary"
          onPress={() => speak(RULES.map((key) => t(key)).join(' '), { force: true })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  drill: { gap: spacing.lg },
  drillTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.safeSoft },
  rules: { gap: spacing.lg },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
