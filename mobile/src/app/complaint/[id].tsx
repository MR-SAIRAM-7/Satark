import Ionicons from '@expo/vector-icons/Ionicons';
import { buildScript, buildZeroFirLetter, formatInr, SCAM_TYPES, STAGE_MESSAGE } from '@satark/shared';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, IconButton, tapFeedback, type IconName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Pill, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { CYBERCRIME_PORTAL, HELPLINE_1930 } from '@/data/directory';
import { buildComplaint } from '@/features/complaint/builder';
import { openKit } from '@/features/complaint/pdf';
import { advanceStage, refreshCase, sendWhatsAppUpdate } from '@/features/complaint/tracker';
import { useLocalized, useT } from '@/i18n';
import { CopyBlock, Tracker, WhatsAppLog } from '@/screens/complaint/sections';
import { dial } from '@/services/dial';
import { speak } from '@/services/voice';
import { selectComplaint, useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

/** Builds the kit, then swaps itself for the finished complaint. */
function Building({ checkId }: { checkId?: string }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current || !checkId) return;
    started.current = true;
    buildComplaint(checkId)
      .then(({ complaint, seconds }) => router.replace({ pathname: '/complaint/[id]', params: { id: complaint.id, seconds: String(seconds) } }))
      .catch(() => setFailed(true));
  }, [checkId]);

  if (failed || !checkId) {
    return (
      <Screen back title={t('kit.title')}>
        <EmptyState icon="alert-circle-outline" title={t('verdict.notFound')} />
      </Screen>
    );
  }
  return (
    <Screen title={t('kit.title')} scroll={false} contentStyle={styles.building}>
      <View style={styles.buildingHalo}>
        <ActivityIndicator size="large" color={c.accentText} />
      </View>
      <AppText variant="heading" center>
        {t('kit.building')}
      </AppText>
    </Screen>
  );
}

function StepAction({ icon, title, sub, onPress, tone, testID }: { icon: IconName; title: string; sub: string; onPress: () => void; tone: { fill: string; soft: string; text: string }; testID?: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}>
      <View style={[styles.stepIcon, { backgroundColor: tone.fill }]}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={c.textMuted}>
          {sub}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
    </Pressable>
  );
}

/** Complaint Kit and FIR tracker (F12): everything needed inside the golden hour. */
export default function ComplaintScreen() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c, shadow } = useTheme();
  const { id, checkId, seconds } = useLocalSearchParams<{ id: string; checkId?: string; seconds?: string }>();
  const complaint = useComplaints(selectComplaint(id));
  const settings = useSettings();
  const showToast = useUi((s) => s.showToast);

  // Stages the cyber cell has set since (bank hold, FIR, IO assigned) come from the server.
  const caseRef = complaint?.caseRef;
  useEffect(() => {
    if (caseRef && id) void refreshCase(id);
  }, [caseRef, id]);

  if (id === 'new') return <Building checkId={checkId} />;
  if (!complaint) {
    return (
      <Screen back title={t('kit.title')}>
        <EmptyState icon="document-text-outline" title={t('verdict.notFound')} />
      </Screen>
    );
  }

  const person = { name: settings.elder.name, locality: settings.elder.locality, lang: settings.lang };
  // Built in English, Telugu or Hindi; Sarvam translates it for any other chosen language.
  const script = buildScript(complaint, settings.lang).map((line) => localized(line));
  const summary = localized(complaint.summary);
  const txn = complaint.transaction;
  const latest = complaint.timeline[complaint.timeline.length - 1];

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
    <Screen back title={t('kit.title')} subtitle={`${(complaint.caseRef ?? complaint.id).toUpperCase()} · ${dayAndTime(complaint.createdAt)}`}>
      <View style={[styles.summary, shadow.card]}>
        <View style={styles.summaryTop}>
          <Pill label={localized(SCAM_TYPES[complaint.scamType].label)} color={c.dangerText} soft={c.dangerSoft} icon="alert-circle" />
          <IconButton icon="volume-high" label={t('verdict.listen')} size={40} variant="tonal" onPress={() => speak(summary, { force: true })} />
        </View>
        {txn ? (
          <View>
            <AppText variant="caption" color={c.textMuted}>
              {t('kit.txn')}
            </AppText>
            <AppText variant="hero" color={c.dangerText}>
              {formatInr(txn.amount)}
            </AppText>
          </View>
        ) : null}
        <AppText variant="body">{summary}</AppText>
        <View style={styles.badges}>
          {seconds ? <Pill label={t('kit.ready', { s: seconds })} color={c.safeText} soft={c.safeSoft} icon="flash" /> : null}
          {complaint.caseRef ? <Pill label={t('kit.filed', { ref: complaint.caseRef })} color={c.accentText} soft={c.accentSoft} icon="shield-checkmark" /> : null}
          {latest ? <Pill label={t(`fir.stage.${latest.stage}`)} color={c.safeText} soft={c.safeSoft} icon="checkmark-circle" /> : null}
        </View>
      </View>

      <SectionHeader title={t('kit.steps')} />
      <Card padded={false} style={styles.steps}>
        <StepAction testID="kit-call-1930" icon="call" title={t('kit.call1930')} sub={t('kit.call1930.sub')} onPress={call1930} tone={{ fill: c.danger, soft: c.dangerSoft, text: c.dangerText }} />
        <View style={styles.divider} />
        <StepAction testID="kit-file-online" icon="globe-outline" title={t('kit.fileOnline')} sub={t('kit.fileOnline.sub')} onPress={fileOnline} tone={{ fill: c.accent, soft: c.accentSoft, text: c.accentText }} />
        <View style={styles.divider} />
        <StepAction icon="logo-whatsapp" title={t('kit.sendWa')} sub={t('kit.sendWa.sub')} onPress={sendOnWhatsApp} tone={{ fill: c.whatsapp, soft: c.whatsappSoft, text: c.safeText }} />
        <View style={styles.divider} />
        <StepAction icon="document" title={t('kit.pdf')} sub={t('kit.pdf.sub')} onPress={() => openKit(complaint, person).catch(() => undefined)} tone={{ fill: c.textMuted, soft: c.surface2, text: c.text }} />
      </Card>

      <Tracker complaint={complaint} />
      <WhatsAppLog complaint={complaint} />

      <Card style={styles.section}>
        <AppText variant="heading">{t('kit.script')}</AppText>
        {script.map((line, index) => (
          <View key={line} style={styles.scriptLine}>
            <View style={styles.scriptNumber}>
              <AppText variant="caption" color={c.onFill} style={styles.bold}>
                {index + 1}
              </AppText>
            </View>
            <AppText variant="body" style={styles.flex} selectable>
              {line}
            </AppText>
          </View>
        ))}
        <Button label={t('verdict.listen')} icon="volume-high" variant="tonal" onPress={() => speak(script.join(' '), { force: true })} />
      </Card>

      {txn ? (
        <Card style={styles.section}>
          <AppText variant="heading">{t('kit.txn')}</AppText>
          <View>
            <Detail label={t('txn.amount')} value={formatInr(txn.amount)} danger />
            {txn.bank ? <Detail label={t('txn.bank')} value={txn.bank} /> : null}
            {txn.reference ? <Detail label={t('txn.ref')} value={txn.reference} /> : null}
            {txn.payee ?? txn.payeeVpa ? <Detail label={t('txn.to')} value={txn.payee ?? txn.payeeVpa ?? ''} /> : null}
            <Detail label={t('txn.time')} value={dayAndTime(txn.at)} last />
          </View>
        </Card>
      ) : null}

      {complaint.suspect.phones.length + complaint.suspect.upiIds.length + complaint.suspect.links.length > 0 ? (
        <Card style={styles.section}>
          <AppText variant="heading">{t('kit.suspect')}</AppText>
          {[...complaint.suspect.phones, ...complaint.suspect.upiIds, ...complaint.suspect.links].map((value) => (
            <View key={value} style={styles.suspect}>
              <View style={styles.suspectIcon}>
                <Ionicons name={value.includes('@') ? 'card' : value.startsWith('+') ? 'call' : 'link'} size={16} color={c.dangerText} />
              </View>
              <AppText variant="bodyStrong" selectable style={styles.flex}>
                {value}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <View>
          <AppText variant="heading">{t('kit.evidence', { n: complaint.evidence.length })}</AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('kit.evidence.sub')}
          </AppText>
        </View>
        {complaint.evidence.map((item) => (
          <View key={item.id} style={styles.evidence}>
            <AppText variant="bodyStrong">{item.label}</AppText>
            <AppText variant="label" color={c.textMuted} numberOfLines={3}>
              {item.content}
            </AppText>
            <AppText variant="caption" color={c.textFaint} selectable style={styles.hash}>
              SHA-256 {item.sha256}
            </AppText>
          </View>
        ))}
        {complaint.pdfSha256 ? (
          <AppText variant="caption" color={c.textFaint} selectable style={styles.hash}>
            PDF SHA-256 {complaint.pdfSha256}
          </AppText>
        ) : null}
      </Card>

      <CopyBlock title={t('kit.narrative')} text={complaint.narrative} />
      <CopyBlock title={t('kit.zeroFir')} subtitle={t('kit.zeroFir.sub')} text={buildZeroFirLetter(complaint, person.name, person.locality)} />
    </Screen>
  );
}

function Detail({ label, value, danger, last }: { label: string; value: string; danger?: boolean; last?: boolean }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={[styles.detail, !last && styles.detailDivider]}>
      <AppText variant="label" color={c.textMuted} style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={danger ? c.dangerText : c.text} selectable style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  building: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  buildingHalo: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: spacing.md, padding: spacing.lg + 2, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  steps: { overflow: 'hidden' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg, minHeight: 72 },
  stepPressed: { backgroundColor: c.surface2 },
  stepIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 76 },
  section: { gap: spacing.md },
  scriptLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  scriptNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  detailLabel: { width: 118 },
  detailValue: { flex: 1, textAlign: 'right' },
  suspect: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  suspectIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  evidence: { gap: 2, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
  hash: { fontFamily: 'monospace' },
}));
