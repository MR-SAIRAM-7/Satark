import Ionicons from '@expo/vector-icons/Ionicons';
import { SCAM_TYPES, type ScamType } from '@satark/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CheckRow } from '@/components/CheckRow';
import { AppText } from '@/components/ui/AppText';
import { Button, tapFeedback } from '@/components/ui/Button';
import { Field, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { buildComplaint } from '@/features/complaint/builder';
import { processIncoming } from '@/features/detection/pipeline';
import { useLocalized, useT } from '@/i18n';
import { useChecks } from '@/store/checks';
import { useComplaints } from '@/store/complaints';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

/** The scams people most often report, in the order they are most often seen. */
const TYPES: ScamType[] = [
  'digital_arrest',
  'kyc_bank',
  'upi_collect',
  'investment',
  'job_task',
  'family_emergency',
  'lottery',
  'courier',
  'electricity',
  'remote_access',
  'phishing_link',
  'sim_block',
  'malware_apk',
  'unknown',
];

/**
 * Start a complaint (F12). A scam Satark already caught becomes a kit in one
 * tap; anything else (a call on another phone, a scam before Satark was
 * installed) can be described in a few fields. Either way the kit, the
 * narrative and the 1930 script are written for the victim.
 */
export default function StartComplaint() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const checks = useChecks((s) => s.checks);
  const complaints = useComplaints((s) => s.complaints);

  const [type, setType] = useState<ScamType>('unknown');
  const [story, setStory] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [lost, setLost] = useState<'no' | 'yes'>('no');
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  // One entry per conversation, newest first, skipping scams that already have a kit.
  const covered = new Set(complaints.flatMap((k) => k.checkIds));
  const seenThreads = new Set<string>();
  const reportable = checks.filter((check) => {
    if (check.response.verdict === 'safe' || covered.has(check.id) || seenThreads.has(check.threadId)) return false;
    seenThreads.add(check.threadId);
    return true;
  });

  const rupees = Number(amount.replace(/[^\d.]/g, ''));
  const enough = story.trim().length >= 8 || phone.replace(/\D/g, '').length >= 6 || upi.trim().length >= 4;

  const submit = async () => {
    if (!enough || busy) return;
    setBusy(true);
    try {
      // The description goes through the same engine, so its numbers, UPI IDs and links become evidence.
      const text = [story.trim(), upi.trim()].filter(Boolean).join('\n');
      const check = await processIncoming(
        { source: 'paste', text: text || upi.trim() || phone.trim(), sender: phone.trim() || null },
        { userInitiated: true, silent: true },
      );
      if (!check) throw new Error('no check');
      const transaction =
        lost === 'yes' && rupees > 0
          ? { type: 'debit' as const, amount: rupees, bank: bank.trim() || undefined, reference: reference.trim() || undefined, payeeVpa: upi.includes('@') ? upi.trim() : undefined, at: Date.now() }
          : null;
      const { complaint, seconds } = await buildComplaint(check.id, { scamType: type, transaction });
      router.replace({ pathname: '/complaint/[id]', params: { id: complaint.id, seconds: String(seconds) } });
    } catch {
      showToast(t('start.failed'), 'warn');
      setBusy(false);
    }
  };

  return (
    <Screen
      back
      title={t('start.title')}
      subtitle={t('start.sub')}
      footer={
        <Button
          testID="start-submit"
          label={t('start.submit')}
          icon="document-text"
          size="lg"
          loading={busy}
          disabled={!enough}
          onPress={submit}
        />
      }>
      {reportable.length > 0 ? (
        <View style={styles.group}>
          <SectionHeader title={t('start.fromAlerts')} />
          {reportable.slice(0, 5).map((check) => (
            <View key={check.id} style={styles.pick}>
              <CheckRow check={check} />
              <Button
                testID="start-use-check"
                label={t('start.useThis')}
                icon="flash"
                variant="tonal"
                size="sm"
                onPress={() => router.replace({ pathname: '/complaint/[id]', params: { id: 'new', checkId: check.id } })}
              />
            </View>
          ))}
          <View style={styles.or}>
            <View style={styles.rule} />
            <AppText variant="caption" color={c.textFaint}>
              {t('start.orDescribe')}
            </AppText>
            <View style={styles.rule} />
          </View>
        </View>
      ) : (
        <View style={styles.hint}>
          <View style={styles.hintIcon}>
            <Ionicons name="create" size={22} color={c.onFill} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t('start.describe')}</AppText>
            <AppText variant="label" color={c.textMuted}>
              {t('start.noAlerts')}
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.group}>
        <SectionHeader title={t('start.type')} />
        <View style={styles.types}>
          {TYPES.map((scamType) => {
            const selected = type === scamType;
            return (
              <Pressable
                key={scamType}
                testID={`start-type-${scamType}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={scamType === 'unknown' ? t('start.other') : localized(SCAM_TYPES[scamType].label)}
                onPress={() => {
                  tapFeedback();
                  setType(scamType);
                }}
                style={({ pressed }) => [styles.type, selected && styles.typeOn, pressed && styles.pressed]}>
                <AppText variant="label" color={selected ? c.onFill : c.text} numberOfLines={2} style={styles.typeLabel}>
                  {scamType === 'unknown' ? t('start.other') : localized(SCAM_TYPES[scamType].label)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field
        testID="start-story"
        label={t('start.story')}
        placeholder={t('start.story.placeholder')}
        value={story}
        onChangeText={setStory}
        multiline
      />
      <Field label={t('start.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91" icon="call-outline" />
      <Field label={t('start.upi')} value={upi} onChangeText={setUpi} autoCapitalize="none" placeholder="name@bank" icon="card-outline" />

      <View style={styles.group}>
        <SectionHeader title={t('start.lost')} />
        <Segmented
          value={lost}
          onChange={setLost}
          options={[
            { value: 'no', label: t('common.no') },
            { value: 'yes', label: t('common.yes') },
          ]}
        />
      </View>
      {lost === 'yes' ? (
        <View style={styles.group}>
          <Field label={t('start.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="₹" icon="cash-outline" />
          <Field label={t('start.bank')} value={bank} onChangeText={setBank} autoCapitalize="words" icon="business-outline" />
          <Field label={t('start.ref')} hint={t('start.ref.hint')} value={reference} onChangeText={setReference} autoCapitalize="characters" icon="receipt-outline" />
        </View>
      ) : null}

      {!enough ? (
        <AppText variant="caption" color={c.textMuted}>
          {t('start.needMore')}
        </AppText>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  group: { gap: spacing.sm + 2 },
  pick: { gap: spacing.sm },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  type: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 54,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  typeOn: { backgroundColor: c.accent, borderColor: c.accent },
  typeLabel: { fontWeight: '600' },
  pressed: { transform: [{ scale: 0.97 }] },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  rule: { flex: 1, height: 1, backgroundColor: c.border },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.accentSoft },
  hintIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
}));
