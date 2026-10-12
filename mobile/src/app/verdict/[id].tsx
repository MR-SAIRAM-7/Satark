import Ionicons from '@expo/vector-icons/Ionicons';
import {
  analyzeLocal,
  getRule,
  maskPhone,
  pickLang,
  SCAM_TYPES,
  uiLangFor,
  voiceLineFor,
  type RuleHit,
} from '@satark/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/DemoBanner';
import { KillChainMeter } from '@/components/KillChainMeter';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, IconBadge, SectionHeader } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { entryForBrand, HELPLINE_1930 } from '@/data/directory';
import { lookupCommunity, reportIndicators } from '@/features/detection/community';
import { useLocalized, useT, type StringKey } from '@/i18n';
import { dial } from '@/services/dial';
import { speak } from '@/services/voice';
import { selectCheck, useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { colors, MAX_CONTENT_WIDTH, radius, spacing, verdictPalette } from '@/theme/tokens';
import { dayAndTime } from '@/utils/time';

const LAYERS = ['rules', 'killChain', 'community', 'ml', 'ai'] as const;

/** Verdict screen (F3): red, amber or green, with the reasons and what to do next. */
export default function VerdictScreen() {
  const t = useT();
  const localized = useLocalized();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useChecks(selectCheck(id));
  const thread = useChecks((s) => (check ? s.threads[check.threadId] : undefined));
  const lang = useSettings((s) => s.lang);
  const guardian = useSettings((s) => s.guardian);
  const safeWord = useSettings((s) => s.safeWord);
  const showToast = useUi((s) => s.showToast);
  const [communityReports, setCommunityReports] = useState(0);

  // Cheap, synchronous re-read of the message for the brand and link details the rules matched.
  const local = useMemo(
    () => (check ? analyzeLocal({ text: check.text, source: check.source, sender: check.sender }) : null),
    [check],
  );

  useEffect(() => {
    if (!check?.communityHit) return;
    lookupCommunity(check.indicators).then(({ hits }) =>
      setCommunityReports(hits.reduce((max, h) => Math.max(max, h.reportCount), 0)),
    );
  }, [check]);

  if (!check || !local) {
    return (
      <Screen back title={t('check.title')}>
        <EmptyState icon="help-circle" title={t('verdict.notFound')} />
      </Screen>
    );
  }

  const { response } = check;
  const { verdict, scam_type, score } = response;
  const palette = verdictPalette[verdict];
  const risky = verdict !== 'safe';
  const ui = uiLangFor(lang);

  // The open alert follows the conversation: the meter climbs as new messages arrive.
  const evidence = thread && thread.stage >= response.stage ? thread.evidence : response.evidence;
  const stage = thread && thread.stage >= response.stage ? thread.stage : response.stage;

  const explanation = pickLang(response.explanation, lang);
  const advice = ui === 'en' ? response.advice : (response.advice_l10n?.[ui] ?? response.advice);
  const brand = local.links.find((l) => l.lookalikeOf)?.lookalikeOf ?? local.signals.brand;
  const realEntry = entryForBrand(brand?.id) ?? (local.signals.authority ? HELPLINE_1930 : undefined);
  const askSafeWord = response.rules.some((r) => r.id === 'R16');

  const reasonText = (hit: RuleHit, field: 'title' | 'why') => {
    const rule = getRule(hit.id);
    return rule ? localized(rule[field]).replace('{brand}', brand?.name ?? '') : hit.id;
  };

  const replay = () => speak(`${voiceLineFor(verdict, scam_type, lang)} ${explanation}`, { force: true });

  const report = async () => {
    await reportIndicators(check.indicators, scam_type, check.id);
    showToast(t('verdict.reported'), 'safe');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={palette.gradient} style={[styles.hero, { paddingTop: insets.top }]}>
        <DemoBanner />
        <View style={styles.heroInner}>
          <View style={styles.heroBar}>
            <Button label="" icon="close" variant="onDark" onPress={goBack} style={styles.close} />
            <View style={styles.riskPill}>
              <AppText variant="label" color={colors.textOnDark}>
                {t('verdict.risk', { score })}
              </AppText>
            </View>
          </View>

          <Animated.View entering={ZoomIn.duration(320)} style={styles.heroIcon}>
            <Ionicons name={palette.icon} size={64} color={palette.main} />
          </Animated.View>
          <AppText testID="verdict-title" variant="display" color={colors.textOnDark} center accessibilityRole="header" style={styles.heroTitle}>
            {t(`verdict.${verdict}` as StringKey)}
          </AppText>
          <AppText variant="heading" color="rgba(255,255,255,0.95)" center>
            {risky ? localized(SCAM_TYPES[scam_type].label) : t('verdict.safe.sub')}
          </AppText>
          {risky ? (
            <AppText variant="body" color="rgba(255,255,255,0.92)" center>
              {t(`verdict.${verdict}.sub` as StringKey)}
            </AppText>
          ) : null}
          <Button label={t('verdict.listen')} icon="volume-high" variant="onDark" onPress={replay} style={styles.listen} />
        </View>
      </LinearGradient>

      <Screen
        embedded
        background="transparent"
        contentStyle={styles.body}
        footer={
          risky ? (
            <>
              {guardian ? (
                <Button
                  label={t('verdict.callFamily', { name: guardian.name })}
                  icon="call"
                  variant="success"
                  size="lg"
                  onPress={() => dial(guardian.phone, { name: guardian.name, family: true })}
                />
              ) : (
                <Button
                  label={t('home.call1930')}
                  icon="call"
                  variant="danger"
                  size="lg"
                  onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })}
                />
              )}
              <Button label={t('verdict.ok')} variant="ghost" onPress={goBack} />
            </>
          ) : (
            <Button label={t('common.done')} size="lg" variant="success" onPress={goBack} />
          )
        }>
        {response.injection_attempt ? (
          <Animated.View entering={FadeInDown.delay(80)}>
            <Card tone={{ main: colors.danger, soft: colors.dangerSoft }} style={styles.banner}>
              <IconBadge name="bug" color={colors.danger} soft={colors.surface} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={colors.dangerDeep}>
                  {t('verdict.injection')}
                </AppText>
                <AppText variant="label" color={colors.textMuted}>
                  {t('verdict.injection.body')}
                </AppText>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {verdict === 'scam' && guardian ? (
          <View style={styles.told}>
            <Ionicons name="notifications" size={18} color={colors.safeDeep} />
            <AppText variant="label" color={colors.safeDeep}>
              {t('verdict.guardianTold', { name: guardian.name })}
            </AppText>
          </View>
        ) : null}

        {askSafeWord ? (
          <Card tone={{ main: colors.warn, soft: colors.warnSoft }} style={styles.banner}>
            <IconBadge name="key" color={colors.warn} soft={colors.surface} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" color={colors.warnDeep}>
                {t('verdict.safeWord')}
              </AppText>
              <AppText variant="label" color={colors.textMuted}>
                {safeWord ? t('verdict.safeWord.yours', { word: safeWord }) : t('verdict.safeWord.body')}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <AppText variant="heading">{t('verdict.why')}</AppText>
          <AppText variant="body">{explanation}</AppText>
          {response.rules.map((hit) => (
            <View key={hit.id} style={styles.reason}>
              <Ionicons name="alert-circle" size={22} color={palette.main} style={styles.reasonIcon} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{reasonText(hit, 'title')}</AppText>
                <AppText variant="label" color={colors.textMuted}>
                  {reasonText(hit, 'why')}
                </AppText>
              </View>
            </View>
          ))}
          {communityReports > 0 ? (
            <View style={styles.reason}>
              <Ionicons name="people" size={22} color={palette.main} style={styles.reasonIcon} />
              <AppText variant="bodyStrong" style={styles.flex}>
                {t('verdict.community', { n: communityReports })}
              </AppText>
            </View>
          ) : null}
        </Card>

        {risky && stage > 0 ? (
          <Card style={styles.section}>
            <View>
              <AppText variant="heading">{t('verdict.killchain')}</AppText>
              <AppText variant="label" color={colors.textMuted}>
                {t('verdict.killchain.sub')} · {t('verdict.stage', { n: stage })}
              </AppText>
            </View>
            <KillChainMeter stage={stage} evidence={evidence} tone={palette.main} />
          </Card>
        ) : null}

        {risky && advice.length > 0 ? (
          <Card style={styles.section}>
            <AppText variant="heading">{t('verdict.todo')}</AppText>
            {advice.map((step, index) => (
              <View key={step} style={styles.reason}>
                <View style={[styles.stepNumber, { backgroundColor: palette.main }]}>
                  <AppText variant="label" color={colors.textOnDark}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.flex}>
                  {step}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        {risky ? (
          <View style={styles.actions}>
            <Button
              label={check.reported ? t('verdict.reported') : t('verdict.report')}
              icon={check.reported ? 'checkmark-circle' : 'flag'}
              variant="secondary"
              disabled={check.reported || check.indicators.length === 0}
              onPress={report}
            />
            <Button
              label={t('verdict.complaint')}
              icon="document-text"
              variant="secondary"
              onPress={() => router.push({ pathname: '/complaint/[id]', params: { id: 'new', checkId: check.id } })}
            />
            <Button
              label={realEntry && brand ? t('verdict.callReal', { brand: brand.name }) : t('verdict.callReal.generic')}
              icon="business"
              variant="secondary"
              onPress={() => (realEntry ? dial(realEntry.number, { name: realEntry.name }) : router.push('/directory'))}
            />
          </View>
        ) : null}

        <SectionHeader title={t('verdict.message')} />
        <Card style={styles.message}>
          <AppText variant="caption" color={colors.textMuted}>
            {check.sender ? t('verdict.from', { sender: maskPhone(check.sender) }) : t(`source.${check.source}` as StringKey)} ·{' '}
            {dayAndTime(check.createdAt)}
          </AppText>
          <AppText variant="body" selectable>
            {check.text}
          </AppText>
        </Card>

        <Card style={styles.section}>
          <View>
            <AppText variant="heading">{t('verdict.layers')}</AppText>
            <AppText variant="label" color={colors.textMuted}>
              {t('verdict.layers.sub')}
            </AppText>
          </View>
          {LAYERS.map((layer) => {
            const value = response.layer_scores[layer];
            return (
              <View key={layer} style={styles.layer}>
                <AppText variant="label" style={styles.layerName}>
                  {t(`layer.${layer}` as StringKey)}
                </AppText>
                <View style={styles.layerTrack}>
                  <View style={[styles.layerFill, { width: `${value ?? 0}%`, backgroundColor: verdictPalette[value !== null && value >= 70 ? 'scam' : value !== null && value >= 40 ? 'suspicious' : 'safe'].main }]} />
                </View>
                <AppText variant="label" color={value === null ? colors.textFaint : colors.text} style={styles.layerValue}>
                  {value === null ? t('layer.server') : value}
                </AppText>
              </View>
            );
          })}
          <AppText variant="caption" color={colors.textFaint}>
            {t('verdict.engine', { ms: check.latencyMs, engine: response.engine ?? 'on-device' })}
          </AppText>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroInner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingTop: spacing.sm },
  close: { minHeight: 48, width: 48, paddingHorizontal: 0, borderRadius: 24 },
  riskPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.22)' },
  heroIcon: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTitle: { fontSize: 40, lineHeight: 52, letterSpacing: 0.5 },
  listen: { marginTop: spacing.md, alignSelf: 'center' },
  body: { paddingTop: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  told: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.safeSoft, padding: spacing.md, borderRadius: radius.md },
  section: { gap: spacing.md },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reasonIcon: { marginTop: 2 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  actions: { gap: spacing.sm },
  message: { gap: spacing.sm },
  layer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  layerName: { width: 112 },
  layerTrack: { flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  layerFill: { height: '100%', borderRadius: radius.pill },
  layerValue: { width: 54, textAlign: 'right' },
});
