import type { Verdict } from '@satark/shared';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CheckRow } from '@/components/CheckRow';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip, EmptyState, IconBadge, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { AlertRow } from '@/screens/home/GuardianHome';
import { useAlerts, useIntel } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { colors, spacing } from '@/theme/tokens';
import { timeAgo } from '@/utils/time';

type Filter = 'all' | Verdict;
const FILTERS: Filter[] = ['all', 'scam', 'suspicious', 'safe'];

/** Everything Satark has checked, blocked or told the family about. */
export default function ActivityTab() {
  const t = useT();
  const role = useSettings((s) => s.role);
  const checks = useChecks((s) => s.checks);
  const alerts = useAlerts((s) => s.alerts);
  const markAllRead = useAlerts((s) => s.markAllRead);
  const blockedCalls = useIntel((s) => s.blockedCalls);
  const [filter, setFilter] = useState<Filter>('all');

  // Opening the tab clears the badge; individual rows stay highlighted until tapped.
  useEffect(() => () => markAllRead(), [markAllRead]);

  const visible = filter === 'all' ? checks : checks.filter((c) => c.response.verdict === filter);
  const isGuardian = role === 'guardian';

  return (
    <Screen inTabs title={t('activity.title')}>
      {isGuardian && alerts.length > 0 ? (
        <View style={styles.list}>
          <SectionHeader title={t('guardian.alerts')} />
          {alerts.slice(0, 6).map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f} label={t(`activity.${f}` as StringKey)} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {visible.length === 0 ? (
        <EmptyState icon="pulse" title={t('activity.empty')} body={t('home.none.sub')} />
      ) : (
        <View style={styles.list}>
          {visible.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </View>
      )}

      {blockedCalls.length > 0 ? (
        <View style={styles.list}>
          <SectionHeader title={t('activity.blockedCalls')} />
          {blockedCalls.map((call) => (
            <Card key={call.id} style={styles.call}>
              <IconBadge name="ban" color={colors.safe} soft={colors.safeSoft} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{call.numberMasked}</AppText>
                <AppText variant="label" color={colors.textMuted}>
                  {t('activity.reportedTimes', { n: call.reportCount })}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textFaint}>
                {timeAgo(call.at, t)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { gap: spacing.sm, paddingVertical: 2 },
  list: { gap: spacing.md },
  call: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
});
