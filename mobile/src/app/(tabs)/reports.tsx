import { formatInr, SCAM_TYPES } from '@satark/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckRow } from '@/components/CheckRow';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, IconBadge, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { FIR_STAGES } from '@/features/complaint/content';
import { useLocalized, useT } from '@/i18n';
import { useChecks } from '@/store/checks';
import { useComplaints } from '@/store/complaints';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Complaint } from '@/types';
import { dayAndTime } from '@/utils/time';

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const localized = useLocalized();
  const done = complaint.timeline.length;
  const latest = complaint.timeline[complaint.timeline.length - 1];

  return (
    <Card onPress={() => router.push({ pathname: '/complaint/[id]', params: { id: complaint.id } })} style={styles.card}>
      <View style={styles.cardTop}>
        <IconBadge name="document-text" />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {localized(SCAM_TYPES[complaint.scamType].label)}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {complaint.id.toUpperCase()} · {dayAndTime(complaint.createdAt)}
          </AppText>
        </View>
        {complaint.transaction ? (
          <AppText variant="bodyStrong" color={colors.danger}>
            {formatInr(complaint.transaction.amount)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.progress}>
        {FIR_STAGES.map((stage, i) => (
          <View key={stage} style={[styles.segment, i < done && styles.segmentDone]} />
        ))}
      </View>
      {latest ? (
        <AppText variant="label" color={colors.safeDeep}>
          {t(`fir.stage.${latest.stage}`)}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Complaint kits and their FIR status. */
export default function ReportsTab() {
  const t = useT();
  const complaints = useComplaints((s) => s.complaints);
  const checks = useChecks((s) => s.checks);
  const [picking, setPicking] = useState(false);

  // One entry per conversation, newest first, skipping scams that already have a kit.
  const covered = new Set(complaints.flatMap((c) => c.checkIds));
  const seenThreads = new Set<string>();
  const reportable = checks.filter((c) => {
    if (c.response.verdict === 'safe' || covered.has(c.id) || seenThreads.has(c.threadId)) return false;
    seenThreads.add(c.threadId);
    return true;
  });

  return (
    <Screen
      inTabs
      title={t('reports.title')}
      subtitle={t('reports.sub')}
      footer={
        <Button
          label={t('reports.new')}
          icon="add-circle"
          size="lg"
          onPress={() => setPicking((p) => !p)}
          variant={picking ? 'secondary' : 'primary'}
        />
      }>
      {picking ? (
        <View style={styles.list}>
          <SectionHeader title={t('reports.pick')} />
          {reportable.length === 0 ? (
            <AppText variant="label" color={colors.textMuted}>
              {t('reports.pick.none')}
            </AppText>
          ) : (
            reportable.slice(0, 6).map((check) => (
              <View key={check.id} style={styles.pick}>
                <CheckRow check={check} />
                <Button
                  label={t('verdict.complaint')}
                  icon="document-text"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/complaint/[id]', params: { id: 'new', checkId: check.id } })}
                />
              </View>
            ))
          )}
        </View>
      ) : null}

      {complaints.length === 0 && !picking ? (
        <EmptyState icon="document-text" title={t('reports.empty')} body={t('reports.empty.sub')} />
      ) : (
        <View style={styles.list}>
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progress: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.safe },
  pick: { gap: spacing.sm },
});
