import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckRow } from '@/components/CheckRow';
import { ShieldCard } from '@/components/ShieldCard';
import { AppText } from '@/components/ui/AppText';
import { tapFeedback, type IconName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { HELPLINE_1930 } from '@/data/directory';
import { useProtection } from '@/hooks/useProtection';
import { useT } from '@/i18n';
import { dial } from '@/services/dial';
import { useIntel } from '@/store/activity';
import { useChecks } from '@/store/checks';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

function QuickAction({ icon, label, tone, onPress }: { icon: IconName; label: string; tone: { color: string; soft: string }; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.quick, pressed && { opacity: 0.8 }]}>
      <View style={[styles.quickIcon, { backgroundColor: tone.soft }]}>
        <Ionicons name={icon} size={28} color={tone.color} />
      </View>
      <AppText variant="label" center numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title" color={color}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} center numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

/** The elder's home: one status, one big button, three ways to reach a real person. */
export function ElderHome() {
  const t = useT();
  const protection = useProtection();
  const name = useSettings((s) => s.elder.name);
  const guardian = useSettings((s) => s.guardian);
  const update = useSettings((s) => s.update);
  const checks = useChecks((s) => s.checks);
  const blockedCalls = useIntel((s) => s.blockedCalls.length);

  const scamsStopped = checks.filter((c) => c.response.verdict === 'scam').length;
  const recent = checks.slice(0, 3);

  const onShieldPress = () => {
    if (protection.state === 'paused') update({ protectionPaused: false });
    else router.push('/permissions');
  };

  return (
    <Screen inTabs>
      <View style={styles.greeting}>
        <View style={styles.greetingText}>
          <AppText variant="title">{name ? t('home.greeting', { name }) : t('home.greeting.plain')}</AppText>
          <AppText variant="label" color={colors.textMuted}>
            {t('app.name')} · {t('app.tagline')}
          </AppText>
        </View>
      </View>

      <ShieldCard state={protection.state} onPress={onShieldPress} />

      <Pressable
        testID="ask-button"
        accessibilityRole="button"
        accessibilityLabel={t('home.ask')}
        onPress={() => {
          tapFeedback();
          router.push('/check');
        }}
        style={({ pressed }) => [styles.askShadow, pressed && { transform: [{ scale: 0.985 }] }]}>
        <LinearGradient colors={['#2F7DF6', '#1554C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ask}>
          <View style={styles.askIcon}>
            <Ionicons name="search" size={34} color={colors.brandBright} />
          </View>
          <View style={styles.askText}>
            <AppText variant="display" color={colors.textOnDark} style={styles.askTitle}>
              {t('home.ask')}
            </AppText>
            <AppText variant="label" color="rgba(255,255,255,0.92)">
              {t('home.ask.sub')}
            </AppText>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.quickRow}>
        {guardian ? (
          <QuickAction
            icon="call"
            label={t('home.callFamily', { name: guardian.name })}
            tone={{ color: colors.safe, soft: colors.safeSoft }}
            onPress={() => dial(guardian.phone, { name: guardian.name, family: true })}
          />
        ) : null}
        <QuickAction
          icon="alert-circle"
          label={t('home.call1930')}
          tone={{ color: colors.danger, soft: colors.dangerSoft }}
          onPress={() => dial(HELPLINE_1930.number, { name: HELPLINE_1930.name })}
        />
        <QuickAction
          icon="business"
          label={t('home.realNumbers')}
          tone={{ color: colors.brandBright, soft: colors.brandSoft }}
          onPress={() => router.push('/directory')}
        />
      </View>

      <Card style={styles.stats}>
        <Stat value={checks.length} label={t('home.stats.checked')} color={colors.brand} />
        <View style={styles.statDivider} />
        <Stat value={scamsStopped} label={t('home.stats.stopped')} color={colors.danger} />
        <View style={styles.statDivider} />
        <Stat value={blockedCalls} label={t('home.stats.blocked')} color={colors.warn} />
      </Card>

      <SectionHeader
        title={t('home.recent')}
        action={checks.length > 3 ? t('common.seeAll') : undefined}
        onAction={() => router.push('/activity')}
      />
      {recent.length === 0 ? (
        <EmptyState icon="mail-open" title={t('home.none')} body={t('home.none.sub')} />
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

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  greetingText: { flex: 1, gap: 2 },
  askShadow: { borderRadius: radius.xl, ...shadow.raised },
  ask: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, borderRadius: radius.xl, minHeight: 132 },
  askIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center' },
  askText: { flex: 1, gap: spacing.xs },
  askTitle: { fontSize: 30, lineHeight: 40 },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  quickIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  list: { gap: spacing.md },
});
