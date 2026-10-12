import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemeToggle } from '@/components/ThemeToggle';
import { AppText } from '@/components/ui/AppText';
import { Glow } from '@/components/ui/Glow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Ring, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { readinessScore, useAlerts, useDrills } from '@/store/activity';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme, type Palette } from '@/theme/tokens';
import type { GuardianAlert } from '@/types';
import { greetingKey, timeAgo } from '@/utils/time';

function alertLook(c: Palette, kind: GuardianAlert['kind']): { icon: keyof typeof Ionicons.glyphMap; color: string; soft: string } {
  switch (kind) {
    case 'scam_message':
      return { icon: 'chatbubble-ellipses', color: c.dangerText, soft: c.dangerSoft };
    case 'scam_call':
      return { icon: 'call', color: c.dangerText, soft: c.dangerSoft };
    case 'call_blocked':
      return { icon: 'ban', color: c.safeText, soft: c.safeSoft };
    case 'call_cut':
      return { icon: 'cut', color: c.warnText, soft: c.warnSoft };
    case 'money_debited':
      return { icon: 'cash', color: c.dangerText, soft: c.dangerSoft };
    case 'complaint_ready':
      return { icon: 'document-text', color: c.accentText, soft: c.accentSoft };
  }
}

export function AlertRow({ alert }: { alert: GuardianAlert }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const markRead = useAlerts((s) => s.markRead);
  const look = alertLook(c, alert.kind);

  const open = () => {
    markRead(alert.id);
    if (alert.complaintId) router.push({ pathname: '/complaint/[id]', params: { id: alert.complaintId } });
    else if (alert.checkId) router.push({ pathname: '/verdict/[id]', params: { id: alert.checkId } });
  };

  return (
    // Tapping acknowledges the alert (which stops the server escalating it) and opens what it is about.
    <Card
      onPress={alert.checkId || alert.complaintId || !alert.read ? open : undefined}
      style={[styles.alert, !alert.read && { borderColor: c.danger + '66' }]}
      accessibilityLabel={alert.title}>
      <View style={[styles.alertIcon, { backgroundColor: look.soft }]}>
        <Ionicons name={look.icon} size={22} color={look.color} />
      </View>
      <View style={styles.flex}>
        <View style={styles.alertTop}>
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {t(`alert.${alert.kind}`)}
          </AppText>
          {alert.read ? null : <View style={styles.unreadDot} />}
          <AppText variant="caption" color={c.textFaint}>
            {timeAgo(alert.createdAt, t)}
          </AppText>
        </View>
        <AppText variant="label" color={c.textMuted} numberOfLines={2}>
          {alert.title === t(`alert.${alert.kind}`) ? alert.summary : `${alert.title} · ${alert.summary}`}
        </AppText>
      </View>
    </Card>
  );
}

/** The guardian's home: is my parent safe right now, and what needs me. */
export function GuardianHome() {
  const t = useT();
  const styles = useStyles();
  const { c, shadow } = useTheme();
  const elder = useSettings((s) => s.elder);
  const alerts = useAlerts((s) => s.alerts);
  const drills = useDrills((s) => s.results);
  const kits = useComplaints((s) => s.complaints.length);

  const name = elder.name || t('guardian.elderFallback');
  const unread = alerts.filter((a) => !a.read && a.kind !== 'call_blocked' && a.kind !== 'complaint_ready').length;
  const atRisk = unread > 0;
  const readiness = readinessScore(drills);
  const statusColor = atRisk ? '#FF7B70' : '#3BE39A';

  return (
    <Screen inTabs>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="overline" color={c.textMuted}>
            {t(greetingKey())}
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {t('guardian.title')}
          </AppText>
        </View>
        <ThemeToggle />
      </View>

      <Animated.View entering={FadeInDown.duration(380)} style={[styles.heroWrap, shadow.raised]}>
        <LinearGradient colors={c.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Glow color={statusColor} size={320} opacity={0.3} style={styles.glow} />
          <View style={styles.heroTop}>
            <View style={[styles.avatar, { borderColor: statusColor }]}>
              <AppText variant="title" color="#FFFFFF">
                {name.trim().charAt(0).toUpperCase() || '·'}
              </AppText>
              <View style={[styles.avatarStatus, { backgroundColor: statusColor }]}>
                <Ionicons name={atRisk ? 'alert' : 'checkmark'} size={13} color="#08101F" />
              </View>
            </View>
            <View style={styles.flex}>
              <AppText variant="title" color="#FFFFFF">
                {t(atRisk ? 'guardian.risk' : 'guardian.safe', { name })}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.74)">
                {atRisk ? t('guardian.risk.sub', { n: unread }) : t('guardian.safe.sub')}
              </AppText>
            </View>
          </View>
          <Button label={t('guardian.call', { name })} icon="call" variant="onDark" size="lg" onPress={() => dial(elder.phone, { name, family: true })} />
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.tiles}>
        <Card style={styles.tile} onPress={() => router.push('/learn')}>
          <Ring size={64} stroke={7} progress={(readiness ?? 0) / 100} color={c.safe}>
            <AppText variant="label" style={styles.ringText}>
              {readiness === null ? '–' : `${readiness}%`}
            </AppText>
          </Ring>
          <AppText variant="label" color={c.textMuted}>
            {readiness === null ? t('guardian.readiness.none') : t('guardian.readiness')}
          </AppText>
        </Card>
        <Card style={styles.tile} onPress={() => router.push('/reports')}>
          <AppText variant="numeral" color={c.accentText}>
            {kits}
          </AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('guardian.kits')}
          </AppText>
        </Card>
      </Animated.View>

      <SectionHeader title={t('guardian.alerts')} action={alerts.length > 4 ? t('common.seeAll') : undefined} onAction={() => router.push('/activity')} />
      {alerts.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title={t('guardian.none')} body={t('guardian.none.sub', { name })} />
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

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  heroWrap: { borderRadius: radius.xxl },
  hero: { padding: spacing.xl, borderRadius: radius.xxl, gap: spacing.xl, overflow: 'hidden' },
  glow: { top: -130, right: -110 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  avatarStatus: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0E1638' },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, gap: spacing.sm, minHeight: 132, justifyContent: 'space-between' },
  ringText: { fontWeight: '800' },
  list: { gap: spacing.sm + 2 },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md + 2 },
  alertIcon: { width: 44, height: 44, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger },
}));
