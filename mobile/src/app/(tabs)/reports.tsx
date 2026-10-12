import Ionicons from '@expo/vector-icons/Ionicons';
import { FIR_STAGES, formatInr, SCAM_TYPES } from '@satark/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { tapFeedback } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Pill, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useLocalized, useT } from '@/i18n';
import { useComplaints } from '@/store/complaints';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import type { Complaint } from '@/types';
import { dayAndTime } from '@/utils/time';

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c } = useTheme();
  const done = complaint.timeline.length;
  const latest = complaint.timeline[complaint.timeline.length - 1];

  return (
    <Card onPress={() => router.push({ pathname: '/complaint/[id]', params: { id: complaint.id } })} style={styles.card} testID="complaint-card">
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name="document-text" size={22} color={c.accentText} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {localized(SCAM_TYPES[complaint.scamType].label)}
          </AppText>
          <AppText variant="caption" color={c.textMuted}>
            {(complaint.caseRef ?? complaint.id).toUpperCase()} · {dayAndTime(complaint.createdAt)}
          </AppText>
        </View>
        {complaint.transaction ? (
          <AppText variant="bodyStrong" color={c.dangerText}>
            {formatInr(complaint.transaction.amount)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.progress}>
        {FIR_STAGES.map((stage, i) => (
          <View key={stage} style={[styles.segment, i < done && styles.segmentDone]} />
        ))}
      </View>
      <View style={styles.cardBottom}>
        {latest ? <Pill label={t(`fir.stage.${latest.stage}`)} color={c.safeText} soft={c.safeSoft} icon="checkmark-circle" /> : null}
        <View style={styles.flex} />
        <AppText variant="label" color={c.textMuted} style={styles.count}>
          {done}/{FIR_STAGES.length}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </View>
    </Card>
  );
}

/** Complaint kits and their FIR status, and the way to start a new one. */
export default function ReportsTab() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const complaints = useComplaints((s) => s.complaints);

  return (
    <Screen inTabs title={t('reports.title')} subtitle={t('reports.sub')}>
      <Animated.View entering={FadeInDown.duration(320)}>
        <Pressable
          testID="reports-new"
          accessibilityRole="button"
          accessibilityLabel={t('reports.newTitle')}
          onPress={() => {
            tapFeedback();
            router.push('/complaint/start');
          }}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <View style={styles.ctaIcon}>
            <Ionicons name="add" size={30} color={c.onFill} />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading" color={c.accentText}>
              {t('reports.newTitle')}
            </AppText>
            <AppText variant="label" color={c.textMuted}>
              {t('reports.newSub')}
            </AppText>
          </View>
          <Ionicons name="arrow-forward" size={22} color={c.accentText} />
        </Pressable>
      </Animated.View>

      {complaints.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('reports.empty')} body={t('reports.empty.sub')} />
      ) : (
        <View style={styles.list}>
          <SectionHeader title={t('reports.yours')} />
          {complaints.map((complaint, index) => (
            <Animated.View key={complaint.id} entering={FadeInDown.delay(60 + index * 50).duration(300)}>
              <ComplaintCard complaint={complaint} />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg + 2,
    borderRadius: radius.xl,
    backgroundColor: c.accentSoft,
    borderWidth: 1,
    borderColor: c.accent + '55',
  },
  ctaIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm + 2 },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: radius.sm + 2, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: c.surface3 },
  segmentDone: { backgroundColor: c.safe },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { fontWeight: '700' },
}));
