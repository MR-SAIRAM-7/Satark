import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, IconBadge, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { readinessScore, useAlerts, useDrills } from '@/store/activity';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, spacing } from '@/theme/tokens';
import type { GuardianAlert } from '@/types';
import { timeAgo } from '@/utils/time';

const ALERT_LOOK: Record<GuardianAlert['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string; soft: string }> = {
  scam_message: { icon: 'chatbubble-ellipses', color: colors.danger, soft: colors.dangerSoft },
  scam_call: { icon: 'call', color: colors.danger, soft: colors.dangerSoft },
  call_blocked: { icon: 'ban', color: colors.safe, soft: colors.safeSoft },
  call_cut: { icon: 'cut', color: colors.warn, soft: colors.warnSoft },
  money_debited: { icon: 'cash', color: colors.danger, soft: colors.dangerSoft },
  complaint_ready: { icon: 'document-text', color: colors.brandBright, soft: colors.brandSoft },
};

export function AlertRow({ alert }: { alert: GuardianAlert }) {
  const t = useT();
  const markRead = useAlerts((s) => s.markRead);
  const look = ALERT_LOOK[alert.kind];

  const open = () => {
    markRead(alert.id);
    if (alert.complaintId) router.push({ pathname: '/complaint/[id]', params: { id: alert.complaintId } });
    else if (alert.checkId) router.push({ pathname: '/verdict/[id]', params: { id: alert.checkId } });
  };

  return (
    <Card onPress={alert.checkId || alert.complaintId ? open : undefined} style={styles.alert} accessibilityLabel={alert.title}>
      <IconBadge name={look.icon} color={look.color} soft={look.soft} />
      <View style={styles.flex}>
        <View style={styles.alertTop}>
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {t(`alert.${alert.kind}`)}
          </AppText>
          {alert.read ? null : <View style={styles.unreadDot} />}
          <AppText variant="caption" color={colors.textFaint}>
            {timeAgo(alert.createdAt, t)}
          </AppText>
        </View>
        <AppText variant="label" color={colors.textMuted} numberOfLines={2}>
          {alert.title === t(`alert.${alert.kind}`) ? alert.summary : `${alert.title} · ${alert.summary}`}
        </AppText>
      </View>
    </Card>
  );
}

/** The guardian's home: is my parent safe right now, and what needs me. */
export function GuardianHome() {
  const t = useT();
  const elder = useSettings((s) => s.elder);
  const alerts = useAlerts((s) => s.alerts);
  const drills = useDrills((s) => s.results);
  const kits = useComplaints((s) => s.complaints.length);

  const name = elder.name || t('guardian.elderFallback');
  const unread = alerts.filter((a) => !a.read && a.kind !== 'call_blocked' && a.kind !== 'complaint_ready').length;
  const atRisk = unread > 0;
  const readiness = readinessScore(drills);

  return (
    <Screen inTabs title={t('guardian.title')}>
      <View style={styles.heroShadow}>
        <LinearGradient
          colors={atRisk ? ['#E03131', '#8C0F0F'] : ['#1A9A5B', '#0A5A32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Ionicons name={atRisk ? 'alert' : 'heart'} size={32} color={atRisk ? colors.danger : colors.safe} />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading" color={colors.textOnDark}>
                {t(atRisk ? 'guardian.risk' : 'guardian.safe', { name })}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.9)">
                {atRisk ? t('guardian.risk.sub', { n: unread }) : t('guardian.safe.sub')}
              </AppText>
            </View>
          </View>
          <Button
            label={t('guardian.call', { name })}
            icon="call"
            variant="onDark"
            size="lg"
            onPress={() => dial(elder.phone, { name, family: true })}
          />
        </LinearGradient>
      </View>

      <View style={styles.tiles}>
        <Card style={styles.tile} onPress={() => router.push('/learn')}>
          <AppText variant="title" color={readiness === null ? colors.textFaint : colors.brand}>
            {readiness === null ? '–' : `${readiness}%`}
          </AppText>
          <AppText variant="label" color={colors.textMuted}>
            {readiness === null ? t('guardian.readiness.none') : t('guardian.readiness')}
          </AppText>
        </Card>
        <Card style={styles.tile} onPress={() => router.push('/reports')}>
          <AppText variant="title" color={colors.brand}>
            {kits}
          </AppText>
          <AppText variant="label" color={colors.textMuted}>
            {t('guardian.kits')}
          </AppText>
        </Card>
      </View>

      <SectionHeader
        title={t('guardian.alerts')}
        action={alerts.length > 4 ? t('common.seeAll') : undefined}
        onAction={() => router.push('/activity')}
      />
      {alerts.length === 0 ? (
        <EmptyState icon="notifications-off" title={t('guardian.none')} body={t('guardian.none.sub', { name })} />
      ) : (
        <View style={styles.list}>
          {alerts.slice(0, 4).map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroShadow: { borderRadius: radius.xl, ...shadow.raised },
  hero: { padding: spacing.xl, borderRadius: radius.xl, gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, gap: 2 },
  list: { gap: spacing.md },
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
});
