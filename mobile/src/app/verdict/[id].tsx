import Ionicons from '@expo/vector-icons/Ionicons';
import { analyzeLocal, getRule, maskPhone, SCAM_TYPES, voiceLineFor, type RuleHit } from '@satark/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { KillChainMeter } from '@/components/KillChainMeter';
import { AppText } from '@/components/ui/AppText';
import { Button, IconButton, tapFeedback, type IconName } from '@/components/ui/Button';
import { EmptyState, Meter, Pill } from '@/components/ui/primitives';
import { goBack } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { entryForBrand, HELPLINE_1930 } from '@/data/directory';
import { lookupCommunity, reportIndicators } from '@/features/detection/community';
import { useLocalized, useT, type StringKey } from '@/i18n';
import { dial } from '@/services/dial';
import { speak } from '@/services/voice';
import { selectCheck, useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

const LAYERS = ['rules', 'killChain', 'community', 'ml', 'ai'] as const;
/** Reasons shown before "more": enough to understand, few enough to read in one breath. */
const TOP_REASONS = 3;

function ActionTile({ icon, label, onPress, disabled, testID }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed, disabled && styles.tileDisabled]}>
      <Ionicons name={icon} size={22} color={c.accentText} />
      <AppText variant="caption" center numberOfLines={2} style={styles.tileLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * The alert pop-up (F3). It leads with the verdict and, straight after, the
 * reason in plain words; then what to do. Everything technical (the message,
 * the Kill Chain evidence, the layer scores) is one tap away, not in the way.
 */
export default function VerdictScreen() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c, verdict: looks } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useChecks(selectCheck(id));
  const thread = useChecks((s) => (check ? s.threads[check.threadId] : undefined));
  const lang = useSettings((s) => s.lang);
  const guardian = useSettings((s) => s.guardian);
  const safeWord = useSettings((s) => s.safeWord);
  const showToast = useUi((s) => s.showToast);
  const [communityReports, setCommunityReports] = useState(0);
  const [allReasons, setAllReasons] = useState(false);
  const [details, setDetails] = useState(false);

  // Cheap, synchronous re-read of the message for the brand and link details the rules matched.
  const local = useMemo(() => (check ? analyzeLocal({ text: check.text, source: check.source, sender: check.sender }) : null), [check]);

  useEffect(() => {
    if (!check?.communityHit) return;
    lookupCommunity(check.indicators).then(({ hits }) => setCommunityReports(hits.reduce((max, h) => Math.max(max, h.reportCount), 0)));
  }, [check]);

  if (!check || !local) {
    return (
      <Sheet onClose={goBack} footer={<Button label={t('common.done')} size="lg" onPress={goBack} />}>
        <EmptyState icon="help-circle-outline" title={t('verdict.notFound')} />
      </Sheet>
    );
  }

  const { response } = check;
  const { verdict, scam_type, score } = response;
  const look = looks[verdict];
  const risky = verdict !== 'safe';

  // The open alert follows the conversation: the meter climbs as new messages arrive.
  const evidence = thread && thread.stage >= response.stage ? thread.evidence : response.evidence;
  const stage = thread && thread.stage >= response.stage ? thread.stage : response.stage;

  // Telugu and Hindi come with the verdict; any other chosen language is translated by Sarvam.
  const explanation = localized(response.explanation);
  const advice = lang === 'hi' || lang === 'te' ? (response.advice_l10n?.[lang] ?? response.advice) : response.advice.map((step) => localized(step));
  const brand = local.links.find((l) => l.lookalikeOf)?.lookalikeOf ?? local.signals.brand;
  const realEntry = entryForBrand(brand?.id) ?? (local.signals.authority ? HELPLINE_1930 : undefined);
  const askSafeWord = response.rules.some((r) => r.id === 'R16');

  const reasonText = (hit: RuleHit, field: 'title' | 'why') => {
    const rule = getRule(hit.id);
    return rule ? localized(rule[field]).replace('{brand}', brand?.name ?? '') : hit.id;
  };
  const reasons = allReasons ? response.rules : response.rules.slice(0, TOP_REASONS);
  const hidden = response.rules.length - reasons.length;

  const replay = () => speak(`${voiceLineFor(verdict, scam_type, lang)} ${explanation}`, { force: true });
  const report = async () => {
    await reportIndicators(check.indicators, scam_type, check.id);
    showToast(t('verdict.reported'), 'safe');
  };
  const complaint = () => router.push({ pathname: '/complaint/[id]', params: { id: 'new', checkId: check.id } });
  const callReal = () => (realEntry ? dial(realEntry.number, { name: realEntry.name }) : router.push('/directory'));

  const footer = risky ? (
    <>
      {guardian ? (
        <Button
          testID="verdict-call-family"
          label={t('verdict.callFamily', { name: guardian.name })}
          icon="call"
          variant="success"
          size="lg"
          onPress={() => dial(guardian.phone, { name: guardian.name, family: true })}
        />
      ) : (
        <Button label={t('home.call1930')} icon="call" variant="danger" size="lg" onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })} />
      )}
      <View style={styles.tiles}>
        <ActionTile icon="volume-high" label={t('verdict.action.listen')} onPress={replay} />
        <ActionTile
          testID="verdict-report"
          icon={check.reported ? 'checkmark-circle' : 'flag'}
          label={t(check.reported ? 'verdict.action.reported' : 'verdict.action.report')}
          disabled={check.reported || check.indicators.length === 0}
          onPress={report}
        />
        <ActionTile testID="verdict-complaint" icon="document-text" label={t('verdict.action.complaint')} onPress={complaint} />
      </View>
    </>
  ) : (
    <Button testID="verdict-done" label={t('common.done')} size="lg" variant="success" onPress={goBack} />
  );

  return (
    <Sheet onClose={goBack} footer={footer} testID="verdict-sheet">
      {/* 1. The verdict. */}
      <View style={styles.header}>
        <Animated.View entering={ZoomIn.duration(300)} style={[styles.badge, { backgroundColor: look.soft }]}>
          <Ionicons name={look.icon} size={34} color={look.text} />
        </Animated.View>
        <View style={styles.headerText}>
          <AppText variant="overline" color={look.text}>
            {t(`verdict.${verdict}` as StringKey)}
            {risky ? ` · ${t('verdict.riskShort', { score })}` : ''}
          </AppText>
          <AppText testID="verdict-title" variant="title" accessibilityRole="header">
            {risky ? localized(SCAM_TYPES[scam_type].label) : t('verdict.safe')}
          </AppText>
        </View>
        <IconButton icon="close" label={t('common.close')} size={40} onPress={goBack} />
      </View>

      <View style={[styles.verdictLine, { backgroundColor: look.soft }]}>
        <Ionicons name={risky ? 'hand-left' : 'checkmark-circle'} size={22} color={look.text} />
        <AppText variant="bodyStrong" color={look.text} style={styles.flex}>
          {t(`verdict.${verdict}.sub` as StringKey)}
        </AppText>
      </View>

      {response.injection_attempt ? (
        <View style={[styles.notice, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="bug" size={20} color={c.dangerText} />
          <View style={styles.flex}>
            <AppText testID="injection-banner" variant="bodyStrong" color={c.dangerText}>
              {t('verdict.injection')}
            </AppText>
            <AppText variant="label" color={c.textMuted}>
              {t('verdict.injection.body')}
            </AppText>
          </View>
        </View>
      ) : null}

      {/* 2. Why: the explanation in one plain paragraph, then the signals that proved it. */}
      <View style={styles.section}>
        <AppText variant="overline" color={c.textMuted}>
          {t('verdict.why')}
        </AppText>
        <AppText variant="body">{explanation}</AppText>
        {reasons.length > 0 ? (
          <View style={styles.reasons}>
            {reasons.map((hit, index) => (
              <View key={hit.id} style={[styles.reason, index > 0 && styles.reasonDivider]}>
                <View style={[styles.reasonDot, { backgroundColor: look.fill }]}>
                  <AppText variant="caption" color="#FFFFFF" style={styles.reasonNumber}>
                    {index + 1}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{reasonText(hit, 'title')}</AppText>
                  <AppText variant="label" color={c.textMuted}>
                    {reasonText(hit, 'why')}
                  </AppText>
                </View>
              </View>
            ))}
            {communityReports > 0 ? (
              <View style={[styles.reason, styles.reasonDivider]}>
                <View style={[styles.reasonDot, { backgroundColor: look.fill }]}>
                  <Ionicons name="people" size={13} color="#FFFFFF" />
                </View>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {t('verdict.community', { n: communityReports })}
                </AppText>
              </View>
            ) : null}
            {hidden > 0 || allReasons ? (
              <Pressable accessibilityRole="button" onPress={() => setAllReasons((v) => !v)} style={styles.more}>
                <AppText variant="label" color={c.accentText}>
                  {allReasons ? t('verdict.fewerReasons') : t('verdict.moreReasons', { n: hidden })}
                </AppText>
                <Ionicons name={allReasons ? 'chevron-up' : 'chevron-down'} size={16} color={c.accentText} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {risky && stage > 0 ? (
        <View style={styles.section}>
          <AppText variant="overline" color={c.textMuted}>
            {t('verdict.killchain.sub')}
          </AppText>
          <KillChainMeter stage={stage} evidence={evidence} tone={look.fill} compact />
        </View>
      ) : null}

      {/* 3. What to do. */}
      {risky && advice.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="overline" color={c.textMuted}>
            {t('verdict.todo')}
          </AppText>
          {advice.slice(0, 4).map((step, index) => (
            <View key={step} style={styles.todo}>
              <View style={[styles.todoNumber, { borderColor: look.fill }]}>
                <AppText variant="caption" color={look.text} style={styles.reasonNumber}>
                  {index + 1}
                </AppText>
              </View>
              <AppText variant="body" style={styles.flex}>
                {step}
              </AppText>
            </View>
          ))}
          <Button
            label={realEntry && brand ? t('verdict.callReal', { brand: brand.name }) : t('verdict.callReal.generic')}
            icon="business"
            variant="tonal"
            onPress={callReal}
          />
        </View>
      ) : null}

      {verdict === 'scam' && guardian ? (
        <View style={[styles.notice, { backgroundColor: c.safeSoft }]}>
          <Ionicons name="notifications" size={18} color={c.safeText} />
          <AppText variant="label" color={c.safeText} style={styles.flex}>
            {t('verdict.guardianTold', { name: guardian.name })}
          </AppText>
        </View>
      ) : null}

      {askSafeWord ? (
        <View style={[styles.notice, { backgroundColor: c.warnSoft }]}>
          <Ionicons name="key" size={20} color={c.warnText} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color={c.warnText}>
              {t('verdict.safeWord')}
            </AppText>
            <AppText variant="label" color={c.textMuted}>
              {safeWord ? t('verdict.safeWord.yours', { word: safeWord }) : t('verdict.safeWord.body')}
            </AppText>
          </View>
        </View>
      ) : null}

      {/* 4. Details, folded away. */}
      <Pressable testID="verdict-details" accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails((v) => !v)} style={styles.detailsToggle}>
        <Ionicons name="document-text-outline" size={20} color={c.textMuted} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {t(details ? 'verdict.hideDetails' : 'verdict.details')}
        </AppText>
        <Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={20} color={c.textMuted} />
      </Pressable>

      {details ? (
        <View style={styles.details}>
          <View style={styles.message}>
            <AppText variant="caption" color={c.textMuted}>
              {check.sender ? t('verdict.from', { sender: maskPhone(check.sender) }) : t(`source.${check.source}` as StringKey)} · {dayAndTime(check.createdAt)}
            </AppText>
            <AppText variant="body" selectable>
              {check.text}
            </AppText>
          </View>

          {risky && stage > 0 ? (
            <View style={styles.section}>
              <AppText variant="overline" color={c.textMuted}>
                {t('verdict.killchain')}
              </AppText>
              <KillChainMeter stage={stage} evidence={evidence} tone={look.fill} />
            </View>
          ) : null}

          <View style={styles.section}>
            <View>
              <AppText variant="overline" color={c.textMuted}>
                {t('verdict.layers')}
              </AppText>
              <AppText variant="caption" color={c.textFaint}>
                {t('verdict.layers.sub')}
              </AppText>
            </View>
            {LAYERS.map((layer) => {
              const value = response.layer_scores[layer];
              const tone = looks[value !== null && value >= 70 ? 'scam' : value !== null && value >= 40 ? 'suspicious' : 'safe'];
              return (
                <View key={layer} style={styles.layer}>
                  <AppText variant="label" style={styles.layerName}>
                    {t(`layer.${layer}` as StringKey)}
                  </AppText>
                  <View style={styles.flex}>
                    <Meter value={value ?? 0} color={tone.fill} />
                  </View>
                  <AppText variant="label" color={value === null ? c.textFaint : c.text} style={styles.layerValue}>
                    {value === null ? t('layer.server') : value}
                  </AppText>
                </View>
              );
            })}
            <Pill label={t('verdict.engine', { ms: check.latencyMs, engine: response.engine ?? 'on-device' })} color={c.textMuted} soft={c.surface2} icon="hardware-chip-outline" />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  verdictLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, padding: spacing.md + 2, borderRadius: radius.md },
  section: { gap: spacing.sm + 2 },
  reasons: { backgroundColor: c.surface2, borderRadius: radius.lg, paddingHorizontal: spacing.md + 2 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  reasonDivider: { borderTopWidth: 1, borderTopColor: c.border },
  reasonDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  reasonNumber: { fontWeight: '800', lineHeight: 16 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
  todo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  todoNumber: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: c.surface2, minHeight: 52 },
  details: { gap: spacing.lg },
  message: { gap: spacing.xs + 2, padding: spacing.md + 2, borderRadius: radius.md, borderTopLeftRadius: 6, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
  layer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  layerName: { width: 104 },
  layerValue: { width: 52, textAlign: 'right' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 66,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  },
  tilePressed: { backgroundColor: c.surface3, transform: [{ scale: 0.96 }] },
  tileDisabled: { opacity: 0.5 },
  tileLabel: { fontWeight: '600' },
}));
