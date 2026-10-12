import Ionicons from '@expo/vector-icons/Ionicons';
import { formatInr, SCAM_TYPES } from '@satark/shared';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { CYBERCRIME_PORTAL, HELPLINE_1930 } from '@/data/directory';
import { buildComplaint } from '@/features/complaint/builder';
import { buildScript, buildZeroFirLetter, STAGE_MESSAGE } from '@/features/complaint/content';
import { openKit } from '@/features/complaint/pdf';
import { advanceStage, sendWhatsAppUpdate } from '@/features/complaint/tracker';
import { useLocalized, useT } from '@/i18n';
import { CopyBlock, Tracker, WhatsAppLog } from '@/screens/complaint/sections';
import { dial } from '@/services/dial';
import { speak } from '@/services/voice';
import { selectComplaint, useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

/** Builds the kit, then swaps itself for the finished complaint. */
function Building({ checkId }: { checkId?: string }) {
  const t = useT();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current || !checkId) return;
    started.current = true;
    buildComplaint(checkId)
      .then(({ complaint, seconds }) =>
        router.replace({ pathname: '/complaint/[id]', params: { id: complaint.id, seconds: String(seconds) } }),
      )
      .catch(() => setFailed(true));
  }, [checkId]);

  if (failed || !checkId) {
    return (
      <Screen back title={t('kit.title')}>
        <EmptyState icon="alert-circle" title={t('verdict.notFound')} />
      </Screen>
    );
  }
  return (
    <Screen title={t('kit.title')} scroll={false} contentStyle={styles.building}>
      <ActivityIndicator size="large" color={colors.brandBright} />
      <AppText variant="heading" center>
        {t('kit.building')}
      </AppText>
    </Screen>
  );
}

/** Complaint Kit and FIR tracker (F12): everything needed inside the golden hour. */
export default function ComplaintScreen() {
  const t = useT();
  const localized = useLocalized();
  const { id, checkId, seconds } = useLocalSearchParams<{ id: string; checkId?: string; seconds?: string }>();
  const complaint = useComplaints(selectComplaint(id));
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);

  if (id === 'new') return <Building checkId={checkId} />;
  if (!complaint) {
    return (
      <Screen back title={t('kit.title')}>
        <EmptyState icon="document-text" title={t('verdict.notFound')} />
      </Screen>
    );
  }

  const person = { name: settings.elder.name, locality: settings.elder.locality, lang: settings.lang };
  const script = buildScript(complaint, settings.lang);
  const txn = complaint.transaction;

  const call1930 = () => {
    dial(HELPLINE_1930.number, { name: HELPLINE_1930.name, complaintId: complaint.id });
    // In demo mode the practice dialer marks this stage when the call "connects".
    if (!settings.demoMode) advanceStage(complaint.id, 'helpline_1930');
  };

  const fileOnline = async () => {
    if (settings.demoMode) {
      router.push({ pathname: '/mock/portal', params: { id: complaint.id } });
      return;
    }
    // Real filing is always the user's own action, with their own OTP.
    await Clipboard.setStringAsync(complaint.narrative);
    showToast(t('common.copied'), 'safe');
    Linking.openURL(CYBERCRIME_PORTAL).catch(() => undefined);
  };

  const sendOnWhatsApp = async () => {
    const body = STAGE_MESSAGE.kit_ready({
      name: settings.elder.name || 'you',
      ref: complaint.id.toUpperCase(),
      amount: txn ? formatInr(txn.amount) : null,
      ack: complaint.ackNumber,
      fir: complaint.firNumber,
    });
    await sendWhatsAppUpdate(complaint.id, body, 'Satark_Complaint_Kit.pdf');
    showToast(t('fir.wa.title'), 'safe');
  };

  return (
    <Screen back title={t('kit.title')} subtitle={`${complaint.id.toUpperCase()} · ${dayAndTime(complaint.createdAt)}`}>
      {seconds ? (
        <View style={styles.ready}>
          <Ionicons name="flash" size={18} color={colors.safeDeep} />
          <AppText variant="label" color={colors.safeDeep}>
            {t('kit.ready', { s: seconds })}
          </AppText>
        </View>
      ) : null}

      <Card tone={{ main: colors.danger, soft: colors.dangerSoft }} style={styles.section}>
        <AppText variant="caption" color={colors.dangerDeep} style={styles.kicker}>
          {localized(SCAM_TYPES[complaint.scamType].label).toUpperCase()}
        </AppText>
        <AppText variant="body">{complaint.summary}</AppText>
        <Button label={t('verdict.listen')} icon="volume-high" variant="secondary" onPress={() => speak(complaint.summary, { force: true })} />
      </Card>

      <SectionHeader title={t('kit.steps')} />
      <View style={styles.actions}>
        <Button testID="kit-call-1930" label={t('kit.call1930')} icon="call" variant="danger" size="lg" onPress={call1930} />
        <Button testID="kit-file-online" label={t('kit.fileOnline')} icon="globe" size="lg" onPress={fileOnline} />
        <View style={styles.row}>
          <Button label={t('kit.sendWa')} icon="logo-whatsapp" variant="whatsapp" style={styles.flex} onPress={sendOnWhatsApp} />
          <Button label={t('kit.pdf')} icon="document" variant="secondary" style={styles.flex} onPress={() => openKit(complaint, person).catch(() => undefined)} />
        </View>
      </View>

      <Tracker complaint={complaint} />
      <WhatsAppLog complaint={complaint} />

      <Card style={styles.section}>
        <AppText variant="heading">{t('kit.script')}</AppText>
        {script.map((line, index) => (
          <View key={line} style={styles.scriptLine}>
            <View style={styles.scriptNumber}>
              <AppText variant="label" color={colors.textOnDark}>
                {index + 1}
              </AppText>
            </View>
            <AppText variant="body" style={styles.flex} selectable>
              {line}
            </AppText>
          </View>
        ))}
        <Button label={t('verdict.listen')} icon="volume-high" variant="secondary" onPress={() => speak(script.join(' '), { force: true })} />
      </Card>

      {txn ? (
        <Card style={styles.section}>
          <AppText variant="heading">{t('kit.txn')}</AppText>
          <Detail label={t('txn.amount')} value={formatInr(txn.amount)} danger />
          {txn.bank ? <Detail label={t('txn.bank')} value={txn.bank} /> : null}
          {txn.reference ? <Detail label={t('txn.ref')} value={txn.reference} /> : null}
          {txn.payee ?? txn.payeeVpa ? <Detail label={t('txn.to')} value={txn.payee ?? txn.payeeVpa ?? ''} /> : null}
          <Detail label={t('txn.time')} value={dayAndTime(txn.at)} />
        </Card>
      ) : null}

      <Card style={styles.section}>
        <AppText variant="heading">{t('kit.suspect')}</AppText>
        {[...complaint.suspect.phones, ...complaint.suspect.upiIds, ...complaint.suspect.links].map((value) => (
          <View key={value} style={styles.suspect}>
            <Ionicons name={value.includes('@') ? 'card' : value.startsWith('+') ? 'call' : 'link'} size={20} color={colors.danger} />
            <AppText variant="bodyStrong" selectable style={styles.flex}>
              {value}
            </AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <View>
          <AppText variant="heading">{t('kit.evidence', { n: complaint.evidence.length })}</AppText>
          <AppText variant="label" color={colors.textMuted}>
            {t('kit.evidence.sub')}
          </AppText>
        </View>
        {complaint.evidence.map((item) => (
          <View key={item.id} style={styles.evidence}>
            <AppText variant="bodyStrong">{item.label}</AppText>
            <AppText variant="label" color={colors.textMuted} numberOfLines={3}>
              {item.content}
            </AppText>
            <AppText variant="caption" color={colors.textFaint} selectable style={styles.hash}>
              SHA-256 {item.sha256}
            </AppText>
          </View>
        ))}
        {complaint.pdfSha256 ? (
          <AppText variant="caption" color={colors.textFaint} selectable style={styles.hash}>
            PDF SHA-256 {complaint.pdfSha256}
          </AppText>
        ) : null}
      </Card>

      <CopyBlock title={t('kit.narrative')} text={complaint.narrative} />
      <CopyBlock title={t('kit.zeroFir')} subtitle={t('kit.zeroFir.sub')} text={buildZeroFirLetter(complaint, person.name, person.locality)} />
    </Screen>
  );
}

function Detail({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.detail}>
      <AppText variant="label" color={colors.textMuted} style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={danger ? colors.danger : colors.text} selectable style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  building: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  ready: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, backgroundColor: colors.safeSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  section: { gap: spacing.md },
  kicker: { fontWeight: '800', letterSpacing: 0.6 },
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  scriptLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  scriptNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { width: 118 },
  detailValue: { flex: 1, textAlign: 'right' },
  suspect: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  evidence: { gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  hash: { fontFamily: 'monospace' },
});
