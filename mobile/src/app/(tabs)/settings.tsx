import Ionicons from '@expo/vector-icons/Ionicons';
import { getLanguage } from '@satark/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { tapFeedback, type IconName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow, Pill, SectionHeader, Segmented, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { useServerStatus, type ServerStatus } from '@/services/health';
import { useSettings, type TextScale, type ThemeMode } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import type { Role } from '@/types';

const SCALES: { value: TextScale; key: StringKey }[] = [
  { value: 1, key: 'settings.textSize.normal' },
  { value: 1.15, key: 'settings.textSize.large' },
  { value: 1.3, key: 'settings.textSize.xlarge' },
];
const THEMES: { value: ThemeMode; key: StringKey; icon: IconName }[] = [
  { value: 'light', key: 'theme.light', icon: 'sunny-outline' },
  { value: 'dark', key: 'theme.dark', icon: 'moon-outline' },
  { value: 'system', key: 'theme.system', icon: 'phone-portrait-outline' },
];
const ROLES: { role: Role; icon: IconName }[] = [
  { role: 'elder', icon: 'shield-checkmark' },
  { role: 'guardian', icon: 'people' },
  { role: 'listener', icon: 'mic' },
];

function ServerRow({ status, onRecheck }: { status: ServerStatus; onRecheck: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const dot = status.state === 'online' ? c.safe : status.state === 'offline' ? c.danger : status.state === 'checking' ? c.warn : c.accent;
  const text =
    status.state === 'online'
      ? t('settings.server.online', { ms: status.ms })
      : status.state === 'offline'
        ? t('settings.server.offline')
        : status.state === 'checking'
          ? t('settings.server.checking')
          : t('settings.engine.device');
  return (
    <Pressable
      testID="server-status"
      accessibilityRole="button"
      onPress={() => {
        tapFeedback();
        onRecheck();
      }}
      style={({ pressed }) => [styles.server, pressed && { backgroundColor: c.surface2 }]}>
      <View style={styles.serverTop}>
        <View style={[styles.serverDot, { backgroundColor: dot }]} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{t('settings.engine')}</AppText>
          <AppText variant="label" color={c.textMuted}>
            {text}
          </AppText>
        </View>
        {status.state === 'device' ? null : <Ionicons name="refresh" size={20} color={c.textFaint} />}
      </View>
      {status.state === 'online' ? (
        <View style={styles.features}>
          {[
            { on: status.voice, key: 'settings.server.voice' as const },
            { on: status.ai, key: 'settings.server.ai' as const },
            { on: status.whatsapp, key: 'settings.server.whatsapp' as const },
          ].map((f) => (
            <Pill
              key={f.key}
              label={t(f.key)}
              icon={f.on ? 'checkmark-circle' : 'remove-circle-outline'}
              color={f.on ? c.safeText : c.textMuted}
              soft={f.on ? c.safeSoft : c.surface2}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function SettingsTab() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const s = useSettings();
  const { status, recheck } = useServerStatus();
  const language = getLanguage(s.lang);

  return (
    <Screen inTabs title={t('settings.title')}>
      <SectionHeader title={t('settings.appearance')} />
      <Card style={styles.group}>
        <AppText variant="label" color={c.textMuted}>
          {t('settings.theme')}
        </AppText>
        <Segmented
          testID="theme-mode"
          value={s.themeMode}
          onChange={(themeMode) => s.update({ themeMode })}
          options={THEMES.map((o) => ({ value: o.value, label: t(o.key), icon: o.icon }))}
        />
        <AppText variant="label" color={c.textMuted} style={styles.groupLabel}>
          {t('settings.textSize')}
        </AppText>
        <Segmented value={s.textScale} onChange={(textScale) => s.update({ textScale })} options={SCALES.map((o) => ({ value: o.value, label: t(o.key) }))} />
      </Card>

      <SectionHeader title={t('settings.languageVoice')} />
      <Card padded={false}>
        <ListRow
          icon="globe-outline"
          title={t('settings.language')}
          subtitle={language.native === language.english ? language.native : `${language.native} · ${language.english}`}
          onPress={() => router.push('/language')}
        />
        <ListRow
          icon="volume-high"
          title={t('settings.voice')}
          subtitle={t('settings.voice.sub')}
          right={<Toggle value={s.voiceEnabled} onChange={(voiceEnabled) => s.update({ voiceEnabled })} label={t('settings.voice')} />}
        />
        <ListRow
          testID="voice-test"
          icon="play-circle"
          title={t('settings.voice.test')}
          subtitle={t('settings.voice.test.sub')}
          tone={{ color: c.safeText, soft: c.safeSoft }}
          onPress={() => router.push('/voice')}
          last
        />
      </Card>

      <SectionHeader title={t('settings.protection')} />
      <Card padded={false}>
        <ListRow
          icon="pause-circle"
          title={t('settings.pause')}
          subtitle={t('settings.pause.sub')}
          tone={{ color: c.warnText, soft: c.warnSoft }}
          right={<Toggle value={s.protectionPaused} onChange={(protectionPaused) => s.update({ protectionPaused })} label={t('settings.pause')} />}
        />
        <ListRow icon="lock-open-outline" title={t('settings.permissions')} onPress={() => router.push('/permissions')} last />
      </Card>

      <SectionHeader title={t('settings.role')} />
      <Card padded={false}>
        {ROLES.map(({ role, icon }, index) => {
          const selected = s.role === role;
          return (
            <ListRow
              key={role}
              testID={`role-${role}`}
              icon={icon}
              title={t(`role.${role}` as StringKey)}
              subtitle={t(`onb.role.${role}.desc` as StringKey)}
              tone={selected ? { color: '#FFFFFF', soft: c.accent } : undefined}
              onPress={() => s.update({ role })}
              right={<Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? c.accentText : c.borderStrong} />}
              last={index === ROLES.length - 1}
            />
          );
        })}
      </Card>

      <SectionHeader title={t('settings.family')} />
      <Card padded={false}>
        <ListRow
          icon="people"
          title={t('settings.family.member')}
          subtitle={s.guardian ? `${s.guardian.name} · ${s.guardian.phone}` : t('settings.family.none')}
          tone={{ color: c.safeText, soft: c.safeSoft }}
          onPress={() => router.push('/onboarding')}
        />
        <ListRow
          testID="pairing-row"
          icon="keypad"
          title={t('settings.pairing')}
          subtitle={t(s.role === 'elder' ? 'settings.pairing.elder' : 'settings.pairing.family')}
          onPress={() => router.push('/pair')}
          last
        />
      </Card>

      <SectionHeader title={t('settings.demoSection')} />
      <Card padded={false}>
        <ListRow
          icon="flask"
          title={t('settings.demo')}
          subtitle={t('settings.demo.sub')}
          tone={{ color: c.warnText, soft: c.warnSoft }}
          right={<Toggle value={s.demoMode} onChange={(demoMode) => s.update({ demoMode })} label={t('settings.demo')} />}
        />
        <ListRow testID="demo-room" icon="game-controller" title={t('settings.demoRoom')} subtitle={t('settings.demoRoom.sub')} onPress={() => router.push('/demo')} last />
      </Card>

      <SectionHeader title={t('settings.about')} />
      <Card padded={false}>
        <ServerRow status={status} onRecheck={recheck} />
      </Card>
      <View style={styles.privacy}>
        <Ionicons name="lock-closed" size={18} color={c.textMuted} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{t('settings.privacy')}</AppText>
          <AppText variant="label" color={c.textMuted}>
            {t('settings.privacy.body')}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={c.textFaint} center>
        Satark 0.1.0 · {t('app.tagline')}
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  group: { gap: spacing.sm + 2 },
  groupLabel: { marginTop: spacing.sm },
  server: { padding: spacing.lg, gap: spacing.md },
  serverTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  serverDot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 14 },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingLeft: 52 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.surface2 },
}));
