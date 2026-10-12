import Ionicons from '@expo/vector-icons/Ionicons';
import { formatInr } from '@satark/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/primitives';
import { goBack } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { HELPLINE_1930 } from '@/data/directory';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <AppText variant="label" color={c.textMuted} style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.rowValue} selectable>
        {value}
      </AppText>
    </View>
  );
}

/**
 * Transaction-after-scam alert (F11). A debit within 60 minutes of a scam
 * warning asks one question; "yes" starts the golden-hour flow with every
 * detail the 1930 operator will ask for already on screen.
 */
export default function TxnAlertScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const event = useUi((s) => s.lastTxn);
  const [confirmed, setConfirmed] = useState(false);

  if (!event) {
    return (
      <Sheet onClose={goBack} footer={<Button label={t('common.done')} size="lg" onPress={goBack} />}>
        <EmptyState icon="cash-outline" title={t('activity.empty')} />
      </Sheet>
    );
  }
  const { txn } = event;
  const rows = [
    txn.bank ? { label: t('txn.bank'), value: `${txn.bank}${txn.accountTail ? ` ··${txn.accountTail}` : ''}` } : null,
    txn.payee ?? txn.payeeVpa ? { label: t('txn.to'), value: txn.payee ?? txn.payeeVpa ?? '' } : null,
    txn.reference ? { label: t('txn.ref'), value: txn.reference } : null,
    { label: t('txn.time'), value: dayAndTime(event.at) },
  ].filter((r): r is { label: string; value: string } => Boolean(r));

  return (
    <Sheet
      onClose={goBack}
      footer={
        confirmed ? (
          <>
            <Button testID="call-1930" label={t('kit.call1930')} icon="call" variant="danger" size="lg" onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })} />
            <Button
              label={t('verdict.complaint')}
              icon="document-text"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/complaint/[id]', params: { id: 'new', checkId: event.relatedCheckId } })}
            />
          </>
        ) : (
          <>
            <Button testID="txn-yes" label={t('txn.yes')} icon="alert-circle" variant="danger" size="lg" onPress={() => setConfirmed(true)} />
            <Button label={t('txn.no')} variant="secondary" onPress={goBack} />
          </>
        )
      }>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="cash" size={30} color={c.dangerText} />
        </View>
        <View style={styles.flex}>
          <AppText variant="overline" color={c.dangerText}>
            {t('txn.after', { min: event.minutesAfter })}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {t('txn.title')}
          </AppText>
        </View>
        <IconButton icon="close" label={t('common.close')} size={40} onPress={goBack} />
      </View>

      <View style={styles.amountCard}>
        <AppText variant="caption" color={c.textMuted}>
          {t('txn.amount')}
        </AppText>
        <AppText variant="hero" color={c.dangerText}>
          {formatInr(txn.amount)}
        </AppText>
        <View style={styles.rows}>
          {rows.map((row, index) => (
            <Row key={row.label} label={row.label} value={row.value} last={index === rows.length - 1} />
          ))}
        </View>
      </View>

      {confirmed ? (
        <View style={styles.golden}>
          <Ionicons name="hourglass" size={26} color={c.warnText} />
          <View style={styles.flex}>
            <AppText variant="heading" color={c.warnText}>
              {t('txn.golden')}
            </AppText>
            <AppText variant="body">{t('txn.golden.body')}</AppText>
          </View>
        </View>
      ) : (
        <AppText variant="heading" center style={styles.question}>
          {t('txn.question')}
        </AppText>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  amountCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.surface2, gap: 2 },
  rows: { marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  rowLabel: { width: 118 },
  rowValue: { flex: 1, textAlign: 'right' },
  question: { paddingVertical: spacing.sm },
  golden: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.warnSoft },
}));
