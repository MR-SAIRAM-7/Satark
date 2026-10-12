import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CheckRow } from '@/components/CheckRow';
import { ShieldCard } from '@/components/ShieldCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppText } from '@/components/ui/AppText';
import { tapFeedback, type IconName } from '@/components/ui/Button';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { HELPLINE_1930 } from '@/data/directory';
import { useProtection } from '@/hooks/useProtection';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { useIntel } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import { greetingKey } from '@/utils/time';

/** One of three ways to reach a real person, laid side by side in a single strip. */
function QuickAction({ icon, label, color, soft, onPress, first, testID }: { icon: IconName; label: string; color: string; soft: string; onPress: () => void; first?: boolean; testID?: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.quick, !first && styles.quickDivider, pressed && { backgroundColor: c.surface2 }]}>
      <View style={[styles.quickIcon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <AppText variant="label" center numberOfLines={2} style={styles.quickLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The elder's home: one status, one big button, three ways to reach a real person. */
export function ElderHome() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const protection = useProtection();
  const name = useSettings((s) => s.elder.name);
  const guardian = useSettings((s) => s.guardian);
  const demoMode = useSettings((s) => s.demoMode);
  const update = useSettings((s) => s.update);
  const checks = useChecks((s) => s.checks);
  const blockedCalls = useIntel((s) => s.blockedCalls.length);

  const scamsStopped = checks.filter((c) => c.response.verdict === 'scam').length;
  const recent = checks.slice(0, 3);
  const simulated = !protection.nativeAvailable && demoMode;

  const onShieldPress = () => {
    if (protection.state === 'paused') update({ protectionPaused: false });
    else router.push('/permissions');
  };

  return (
    <Screen inTabs>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="overline" color={c.textMuted}>
            {t(greetingKey())}
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {name ? t('home.greeting', { name }) : t('home.greeting.plain')}
          </AppText>
        </View>
        <ThemeToggle />
      </View>

      <Animated.View entering={FadeInDown.duration(380)}>
        <ShieldCard
          state={protection.state}
          onPress={onShieldPress}
          checks={[
            { label: t('home.chip.messages'), on: protection.state === 'protected' },
            { label: t('home.chip.calls'), on: protection.status.callScreening || simulated },
            { label: t('home.chip.family'), on: Boolean(guardian) },
          ]}
          stats={[
            { value: checks.length, label: t('home.stats.checked') },
            { value: scamsStopped, label: t('home.stats.stopped'), color: '#FF8A7F' },
            { value: blockedCalls, label: t('home.stats.blocked'), color: '#FFC266' },
          ]}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(70).duration(380)}>
        <Pressable
          testID="ask-button"
          accessibilityRole="button"
          accessibilityLabel={t('home.ask')}
          onPress={() => {
            tapFeedback();
            router.push('/check');
          }}
          style={({ pressed }) => [styles.askWrap, pressed && styles.pressed]}>
          <LinearGradient colors={[c.accent, c.accentPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ask}>
            <View style={styles.askIcon}>
              <Ionicons name="scan" size={28} color={c.accent} />
            </View>
            <View style={styles.flex}>
              <AppText variant="title" color={c.onFill}>
                {t('home.ask')}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.86)">
                {t('home.ask.sub')}
              </AppText>
            </View>
            <View style={styles.askArrow}>
              <Ionicons name="arrow-forward" size={22} color={c.onFill} />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(380)} style={styles.quickRow}>
        {guardian ? (
          <QuickAction
            first
            icon="call"
            label={t('home.callFamily', { name: guardian.name })}
            color={c.safeText}
            soft={c.safeSoft}
            onPress={() => dial(guardian.phone, { name: guardian.name, family: true })}
          />
        ) : null}
        <QuickAction
          first={!guardian}
          icon="alert-circle"
          label={t('home.call1930')}
          color={c.dangerText}
          soft={c.dangerSoft}
          onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })}
        />
        <QuickAction icon="business" label={t('home.realNumbers')} color={c.accentText} soft={c.accentSoft} onPress={() => router.push('/directory')} />
      </Animated.View>

      <SectionHeader title={t('home.recent')} action={checks.length > 3 ? t('common.seeAll') : undefined} onAction={() => router.push('/activity')} />
      {recent.length === 0 ? (
        <EmptyState icon="mail-open-outline" title={t('home.none')} body={t('home.none.sub')} />
      ) : (
        <View style={styles.list}>
          {recent.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  flex: { flex: 1 },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.94 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  askWrap: { borderRadius: radius.xl, ...shadow.raised },
  ask: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg + 4, borderRadius: radius.xl, minHeight: 108 },
  askIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  askArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  quickRow: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  quick: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.xs },
  quickDivider: { borderLeftWidth: 1, borderLeftColor: c.border },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontWeight: '700' },
  list: { gap: spacing.sm + 2 },
}));
