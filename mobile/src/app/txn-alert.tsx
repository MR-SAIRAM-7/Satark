import Ionicons from '@expo/vector-icons/Ionicons';
import { formatInr } from '@satark/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { HELPLINE_1930 } from '@/data/directory';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { useUi } from '@/store/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant="label" color={colors.textMuted} style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText variant={strong ? 'heading' : 'bodyStrong'} color={strong ? colors.danger : colors.text} style={styles.rowValue} selectable>
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
  const event = useUi((s) => s.lastTxn);
  const [confirmed, setConfirmed] = useState(false);

  if (!event) {
    return (
      <Screen back title={t('txn.title')}>
        <EmptyState icon="cash" title={t('activity.empty')} />
      </Screen>
    );
  }
  const { txn } = event;

  return (
    <Screen
      back
      title={t('txn.title')}
      subtitle={t('txn.after', { min: event.minutesAfter })}
      background={colors.dangerSoft}
      footer={
        confirmed ? (
          <>
            <Button
              testID="call-1930"
              label={t('kit.call1930')}
              icon="call"
              variant="danger"
              size="lg"
              onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })}
            />
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
            <Button label={t('txn.no')} variant="secondary" size="lg" onPress={goBack} />
          </>
        )
      }>
      <Card style={styles.card}>
        <Row label={t('txn.amount')} value={formatInr(txn.amount)} strong />
        {txn.bank ? <Row label={t('txn.bank')} value={`${txn.bank}${txn.accountTail ? ` ··${txn.accountTail}` : ''}`} /> : null}
        {txn.payee ?? txn.payeeVpa ? <Row label={t('txn.to')} value={txn.payee ?? txn.payeeVpa ?? ''} /> : null}
        {txn.reference ? <Row label={t('txn.ref')} value={txn.reference} /> : null}
        <Row label={t('txn.time')} value={dayAndTime(event.at)} />
      </Card>

      {confirmed ? (
        <View style={styles.golden}>
          <Ionicons name="hourglass" size={30} color={colors.warnDeep} />
          <View style={styles.flex}>
            <AppText variant="heading" color={colors.warnDeep}>
              {t('txn.golden')}
            </AppText>
            <AppText variant="body" color={colors.warnDeep}>
              {t('txn.golden.body')}
            </AppText>
          </View>
        </View>
      ) : (
        <AppText variant="title" center style={styles.question}>
          {t('txn.question')}
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { width: 118 },
  rowValue: { flex: 1, textAlign: 'right' },
  question: { paddingVertical: spacing.lg },
  golden: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warnSoft,
    borderWidth: 1.5,
    borderColor: colors.warnBright,
  },
});
