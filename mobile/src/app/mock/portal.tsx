import Ionicons from '@expo/vector-icons/Ionicons';
import { dateTime, formatInr, SCAM_TYPES } from '@satark/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Field } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { demoAckNumber, saveAcknowledgement } from '@/features/complaint/tracker';
import { useT } from '@/i18n';
import { selectComplaint, useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

type Step = 'form' | 'otp' | 'done';

function Filled({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={styles.filled}>
      <AppText variant="caption" color={c.textMuted}>
        {label}
      </AppText>
      <AppText variant="label" numberOfLines={4}>
        {value}
      </AppText>
      <View style={styles.auto}>
        <Ionicons name="flash" size={12} color={c.safeText} />
        <AppText variant="caption" color={c.safeText}>
          Filled by Satark
        </AppText>
      </View>
    </View>
  );
}

/**
 * Practice complaint portal (F8). Shows the automated part of filing - every
 * field pre-filled from the kit - and keeps the two things only the victim may
 * do: review and submit with their own OTP. It is deliberately not styled as
 * the real portal, submits nothing, and issues DEMO- acknowledgement numbers.
 */
export default function MockPortal() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const complaint = useComplaints(selectComplaint(id));
  const elder = useSettings((s) => s.elder);
  const [step, setStep] = useState<Step>('form');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  if (!complaint) {
    return (
      <Screen back title={t('mock.portal.title')}>
        <EmptyState icon="document-text" title={t('verdict.notFound')} />
      </Screen>
    );
  }

  const txn = complaint.transaction;
  const submit = async () => {
    setBusy(true);
    await saveAcknowledgement(complaint.id, demoAckNumber());
    setBusy(false);
    setStep('done');
  };

  return (
    <Screen
      back
      title={t('mock.portal.title')}
      footer={
        step === 'form' ? (
          <Button testID="portal-submit" label={t('mock.portal.submit')} icon="send" size="lg" onPress={() => setStep('otp')} />
        ) : step === 'otp' ? (
          <Button testID="portal-verify" label={t('common.continue')} icon="checkmark-circle" size="lg" loading={busy} disabled={otp.length < 4} onPress={submit} />
        ) : (
          <Button label={t('common.done')} variant="success" size="lg" onPress={goBack} />
        )
      }>
      <View style={styles.note}>
        <Ionicons name="flask" size={18} color={c.warnText} />
        <AppText variant="label" color={c.warnText} style={styles.flex}>
          {t('mock.portal.note')}
        </AppText>
      </View>

      {step === 'form' ? (
        <Card style={styles.section}>
          <Filled label="Category" value={`Online Financial Fraud · ${SCAM_TYPES[complaint.scamType].label.en}`} />
          <Filled label="Complainant" value={`${elder.name || '-'}, ${elder.locality}`} />
          <Filled label="Date and time of incident" value={dateTime(complaint.evidence[0]?.at ?? complaint.createdAt)} />
          {txn ? (
            <>
              <Filled label="Amount lost" value={formatInr(txn.amount)} />
              <Filled label="Bank and transaction reference" value={`${txn.bank ?? '-'} · ${txn.reference ?? '-'}`} />
            </>
          ) : null}
          <Filled
            label="Suspect identifiers"
            value={[...complaint.suspect.phones, ...complaint.suspect.upiIds, ...complaint.suspect.links].join(', ') || '-'}
          />
          <Filled label="Incident description" value={complaint.narrative.split('\n').slice(4, 6).join(' ')} />
          <Filled label="Evidence" value={`${complaint.evidence.length} file(s) with SHA-256 hashes`} />
        </Card>
      ) : null}

      {step === 'otp' ? (
        <Card style={styles.section}>
          <AppText variant="heading">{t('mock.portal.otp')}</AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('fir.noAutoSubmit')}
          </AppText>
          <Field testID="portal-otp" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="• • • • • •" autoFocus />
        </Card>
      ) : null}

      {step === 'done' ? (
        <Card tone={{ main: c.safe, soft: c.safeSoft }} style={styles.done}>
          <Ionicons name="checkmark-circle" size={64} color={c.safeText} />
          <AppText variant="heading" center color={c.safeText}>
            {t('mock.portal.done')}
          </AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('kit.ack')}
          </AppText>
          <AppText variant="title" selectable>
            {complaint.ackNumber}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: c.warnSoft },
  section: { gap: spacing.md },
  filled: { gap: 2, paddingBottom: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: c.border },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  done: { alignItems: 'center', gap: spacing.sm },
}));
