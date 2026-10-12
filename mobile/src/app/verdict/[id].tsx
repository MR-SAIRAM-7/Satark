import Ionicons from '@expo/vector-icons/Ionicons';
import { analyzeLocal, getRule, maskPhone, SCAM_TYPES, voiceLineFor, type RuleHit } from '@satark/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { KillChainMeter } from '@/components/KillChainMeter';
import { AppText } from '@/components/ui/AppText';
import { Button, tapFeedback, type IconName } from '@/components/ui/Button';
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
/** Warning signs shown at once: enough to understand, few enough to read in one breath. */
const TOP_SIGNS = 3;
/** Steps shown: the first three are the ones that matter in the moment. */
const TOP_STEPS = 3;

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
      <Ionicons name={icon} size={20} color={c.accentText} />
      <AppText variant="caption" center numberOfLines={1} style={styles.tileLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * The alert pop-up (F3). Read top to bottom it answers three questions, in
 * this order and nothing else: what is it (the coloured band), why (one plain
 * paragraph and the warning signs Satark found), and what do I do (three
 * steps and one big button). The message itself, the Kill Chain evidence and
 * the layer scores are folded away under "details".
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
  const [openSign, setOpenSign] = useState<string | null>(null);
  const [allSigns, setAllSigns] = useState(false);
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

  const ruleText = (hit: RuleHit, field: 'title' | 'why') => {
    const rule = getRule(hit.id);
    return rule ? localized(rule[field]).replace('{brand}', brand?.name ?? '') : hit.id;
  };
  const signs = allSigns ? response.rules : response.rules.slice(0, TOP_SIGNS);
  const hiddenSigns = response.rules.length - signs.length;

  const replay = () => speak(`${voiceLineFor(verdict, scam_type, lang)} ${explanation}`, { force: true });
  const report = async () => {
    await reportIndicators(check.indicators, scam_type, check.id);
    showToast(t('verdict.reported'), 'safe');
  };
  const complaint = () => router.push({ pathname: '/complaint/[id]', params: { id: 'new', checkId: check.id } });
  const callReal = () => (realEntry ? dial(realEntry.number, { name: realEntry.name }) : router.push('/directory'));

  // 1. What is it: the verdict colour, edge to edge, with the risk score.
  const header = (
    <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.band}>
      <View style={styles.bandTop}>
        <Animated.View entering={ZoomIn.duration(320)} style={styles.bandIcon}>
          <Ionicons name={look.icon} size={26} color="#FFFFFF" />
        </Animated.View>
        <AppText variant="overline" color="rgba(255,255,255,0.9)" style={styles.flex}>
          {t(`verdict.${verdict}` as StringKey)}
        </AppText>
        {risky ? (
          <View style={styles.score} accessibilityLabel={t('verdict.risk', { score })}>
            <AppText variant="heading" color="#FFFFFF" style={styles.scoreValue}>
              {score}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              /100
            </AppText>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={goBack} style={styles.close}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <AppText testID="verdict-title" variant="title" color="#FFFFFF" accessibilityRole="header">
        {risky ? localized(SCAM_TYPES[scam_type].label) : t('verdict.safe')}
      </AppText>
      <View style={styles.bandSub}>
        <Ionicons name={risky ? 'hand-left' : 'checkmark-circle'} size={18} color="#FFFFFF" />
        <AppText variant="bodyStrong" color="#FFFFFF" style={styles.flex}>
          {t(`verdict.${verdict}.sub` as StringKey)}
        </AppText>
      </View>
    </LinearGradient>
  );

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
    <Sheet onClose={goBack} header={header} footer={footer} testID="verdict-sheet">
      {response.injection_attempt ? (
        <View style={[styles.notice, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="bug" size={18} color={c.dangerText} />
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

      {/* 2. Why: the reason in one plain paragraph, then the signs that prove it. */}
      <View style={styles.section}>
        <AppText variant="overline" color={c.textMuted}>
          {t('verdict.why')}
        </AppText>
        <AppText variant="body" style={styles.explanation}>
          {explanation}
        </AppText>
      </View>

      {signs.length > 0 || communityReports > 0 ? (
        <View style={styles.signs}>
          {signs.map((hit, index) => {
            const open = openSign === hit.id;
            return (
              <Pressable
                key={hit.id}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenSign(open ? null : hit.id)}
                style={[styles.sign, index > 0 && styles.divided]}>
                <View style={[styles.signMark, { backgroundColor: look.soft }]}>
                  <Ionicons name={risky ? 'alert' : 'checkmark'} size={14} color={look.text} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{ruleText(hit, 'title')}</AppText>
                  {open ? (
                    <Animated.View entering={FadeIn.duration(160)}>
                      <AppText variant="label" color={c.textMuted}>
                        {ruleText(hit, 'why')}
                      </AppText>
                    </Animated.View>
                  ) : null}
                </View>
                <Ionicons name={open ? 'chevron-up' : 'information-circle-outline'} size={18} color={c.textFaint} />
              </Pressable>
            );
          })}
          {communityReports > 0 ? (
            <View style={[styles.sign, signs.length > 0 && styles.divided]}>
              <View style={[styles.signMark, { backgroundColor: look.soft }]}>
                <Ionicons name="people" size={13} color={look.text} />
              </View>
              <AppText variant="bodyStrong" style={styles.flex}>
                {t('verdict.community', { n: communityReports })}
              </AppText>
            </View>
          ) : null}
          {hiddenSigns > 0 || allSigns ? (
            <Pressable accessibilityRole="button" onPress={() => setAllSigns((v) => !v)} style={[styles.more, styles.divided]}>
              <AppText variant="label" color={c.accentText}>
                {allSigns ? t('verdict.fewerReasons') : t('verdict.moreReasons', { n: hiddenSigns })}
              </AppText>
              <Ionicons name={allSigns ? 'chevron-up' : 'chevron-down'} size={16} color={c.accentText} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* 3. What to do: three steps, numbered. */}
      {risky && advice.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="overline" color={c.textMuted}>
            {t('verdict.todo')}
          </AppText>
          <View style={styles.steps}>
            {advice.slice(0, TOP_STEPS).map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: look.fill }]}>
                  <AppText variant="caption" color="#FFFFFF" style={styles.stepNumberText}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {step}
                </AppText>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={callReal} style={styles.realLink}>
            <Ionicons name="business-outline" size={18} color={c.accentText} />
            <AppText variant="label" color={c.accentText} style={styles.flex}>
              {realEntry && brand ? t('verdict.callReal', { brand: brand.name }) : t('verdict.callReal.generic')}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={c.accentText} />
          </Pressable>
        </View>
      ) : null}

      {askSafeWord ? (
        <View style={[styles.notice, { backgroundColor: c.warnSoft }]}>
          <Ionicons name="key" size={18} color={c.warnText} />
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

      {verdict === 'scam' && guardian ? (
        <View style={styles.told}>
          <Ionicons name="notifications" size={16} color={c.safeText} />
          <AppText variant="label" color={c.safeText} style={styles.flex}>
            {t('verdict.guardianTold', { name: guardian.name })}
          </AppText>
        </View>
      ) : null}

      {/* 4. Details, folded away. */}
      <Pressable testID="verdict-details" accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails((v) => !v)} style={styles.detailsToggle}>
        <Ionicons name="document-text-outline" size={18} color={c.textMuted} />
        <AppText variant="label" color={c.textMuted} style={styles.flex}>
          {t(details ? 'verdict.hideDetails' : 'verdict.details')}
        </AppText>
        <Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
      </Pressable>

      {details ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.details}>
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
              <View>
                <AppText variant="overline" color={c.textMuted}>
                  {t('verdict.killchain')}
                </AppText>
                <AppText variant="caption" color={c.textFaint}>
                  {t('verdict.killchain.sub')}
                </AppText>
              </View>
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
        </Animated.View>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  band: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg + 2, gap: spacing.sm },
  bandTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bandIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 2, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: 'rgba(0,0,0,0.18)' },
  scoreValue: { fontVariant: ['tabular-nums'] },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  bandSub: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  section: { gap: spacing.sm },
  explanation: { lineHeight: 26 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, padding: spacing.md + 2, borderRadius: radius.md },
  signs: { borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  sign: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md + 2 },
  divided: { borderTopWidth: 1, borderTopColor: c.border },
  signMark: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.md, paddingHorizontal: spacing.md + 2 },
  steps: { gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: c.surface2 },
  stepNumber: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontWeight: '800', lineHeight: 16 },
  realLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  told: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
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
    gap: 3,
    minHeight: 58,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  },
  tilePressed: { backgroundColor: c.surface3, transform: [{ scale: 0.96 }] },
  tileDisabled: { opacity: 0.5 },
  tileLabel: { fontWeight: '700' },
}));
