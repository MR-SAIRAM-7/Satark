import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@satark/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CheckRow } from '@/components/CheckRow';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { AlertRow } from '@/screens/home/GuardianHome';
import { useAlerts, useIntel } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import { timeAgo } from '@/utils/time';

type Filter = 'all' | Verdict;
const FILTERS: Filter[] = ['all', 'scam', 'suspicious', 'safe'];

/** Everything Satark has checked, blocked or told the family about. */
export default function ActivityTab() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
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
    <Screen inTabs title={t('activity.title')} subtitle={t('activity.sub')}>
      {isGuardian && alerts.length > 0 ? (
        <View style={styles.list}>
          <SectionHeader title={t('guardian.alerts')} />
          {alerts.slice(0, 6).map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </View>
      ) : null}

      <Segmented
        testID="activity-filter"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f, label: t(`activity.${f}` as StringKey) }))}
      />

      {visible.length === 0 ? (
        <EmptyState icon="pulse-outline" title={t('activity.empty')} body={t('home.none.sub')} />
      ) : (
        <View style={styles.list}>
          {visible.map((check, index) => (
            <Animated.View key={check.id} entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
              <CheckRow check={check} />
            </Animated.View>
          ))}
        </View>
      )}

      {blockedCalls.length > 0 ? (
        <View style={styles.list}>
          <SectionHeader title={t('activity.blockedCalls')} />
          <Card padded={false}>
            {blockedCalls.map((call, index) => (
              <View key={call.id} style={[styles.call, index < blockedCalls.length - 1 && styles.divider]}>
                <View style={styles.callIcon}>
                  <Ionicons name="ban" size={20} color={c.safeText} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{call.numberMasked}</AppText>
                  <AppText variant="label" color={c.textMuted}>
                    {t('activity.reportedTimes', { n: call.reportCount })}
                  </AppText>
                </View>
                <AppText variant="caption" color={c.textFaint}>
                  {timeAgo(call.at, t)}
                </AppText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  list: { gap: spacing.sm + 2 },
  call: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  callIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: c.safeSoft, alignItems: 'center', justifyContent: 'center' },
}));
