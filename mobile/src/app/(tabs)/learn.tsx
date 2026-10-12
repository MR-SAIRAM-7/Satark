import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Glow } from '@/components/ui/Glow';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow, Ring, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { speak } from '@/services/voice';
import { readinessScore, useDrills } from '@/store/activity';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

const RULES: { key: StringKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'learn.rule.1', icon: 'videocam-off' },
  { key: 'learn.rule.2', icon: 'keypad' },
  { key: 'learn.rule.3', icon: 'qr-code' },
  { key: 'learn.rule.4', icon: 'call' },
  { key: 'learn.rule.5', icon: 'people' },
];

/** Prevention: practise on safe examples, know the rules, know who to call. */
export default function LearnTab() {
  const t = useT();
  const styles = useStyles();
  const { c, shadow } = useTheme();
  const readiness = readinessScore(useDrills((s) => s.results));

  return (
    <Screen inTabs title={t('learn.title')} subtitle={t('learn.sub')}>
      <Animated.View entering={FadeInDown.duration(360)}>
        {/* The card is not itself a button: its own button starts the drill (a button inside a button is invalid). */}
        <View style={[styles.heroWrap, shadow.raised]}>
          <LinearGradient colors={c.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Glow color="#3BE39A" size={300} opacity={0.26} style={styles.glow} />
            <View style={styles.heroTop}>
              <Ring size={88} stroke={8} progress={(readiness ?? 0) / 100} color="#3BE39A" track="rgba(255,255,255,0.12)">
                <AppText variant="heading" color="#FFFFFF">
                  {readiness === null ? '–' : `${readiness}%`}
                </AppText>
              </Ring>
              <View style={styles.flex}>
                <AppText variant="overline" color="rgba(255,255,255,0.7)">
                  {t('guardian.readiness')}
                </AppText>
                <AppText variant="title" color="#FFFFFF">
                  {t('learn.drills')}
                </AppText>
                <AppText variant="label" color="rgba(255,255,255,0.74)">
                  {t('learn.drills.sub')}
                </AppText>
              </View>
            </View>
            <Button label={readiness === null ? t('learn.start') : t('drill.again')} icon="play" variant="onDark" size="lg" onPress={() => router.push('/drill')} />
          </LinearGradient>
        </View>
      </Animated.View>

      <Card padded={false}>
        <ListRow
          icon="call"
          title={t('learn.directory')}
          subtitle={t('learn.directory.sub')}
          tone={{ color: c.safeText, soft: c.safeSoft }}
          onPress={() => router.push('/directory')}
        />
        <ListRow icon="radio" title={t('learn.radar')} subtitle={t('learn.radar.sub')} tone={{ color: c.dangerText, soft: c.dangerSoft }} onPress={() => router.push('/insights')} last />
      </Card>

      <View style={styles.rulesHeader}>
        <View style={styles.flex}>
          <SectionHeader title={t('learn.rules')} />
        </View>
        <IconButton icon="volume-high" label={t('verdict.listen')} variant="tonal" size={42} onPress={() => speak(RULES.map((r) => t(r.key)).join(' '), { force: true })} />
      </View>
      <View style={styles.rules}>
        {RULES.map((rule, index) => (
          <Animated.View key={rule.key} entering={FadeInDown.delay(80 + index * 50).duration(320)} style={styles.rule}>
            <View style={styles.ruleIcon}>
              <Ionicons name={rule.icon} size={20} color={c.accentText} />
            </View>
            <View style={styles.flex}>
              <AppText variant="overline" color={c.textFaint}>
                {t('learn.ruleN', { n: index + 1 })}
              </AppText>
              <AppText variant="bodyStrong">{t(rule.key)}</AppText>
            </View>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  heroWrap: { borderRadius: radius.xxl },
  hero: { borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.xl, overflow: 'hidden' },
  glow: { right: -100, top: -120 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  rulesHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  rules: { gap: spacing.sm + 2 },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  ruleIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
}));
