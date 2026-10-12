import { voiceLineFor } from '@satark/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ListRow, SectionHeader, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { hasBackend, hasDirectLlm } from '@/config/env';
import { resetDemoData } from '@/features/demo/seed';
import { refreshPairingCode } from '@/features/family/sync';
import { useT, type StringKey } from '@/i18n';
import { speak } from '@/services/voice';
import { useSettings, type TextScale } from '@/store/settings';
import { colors, spacing } from '@/theme/tokens';
import type { Role } from '@/types';

const SCALES: { value: TextScale; key: StringKey }[] = [
  { value: 1, key: 'settings.textSize.normal' },
  { value: 1.15, key: 'settings.textSize.large' },
  { value: 1.3, key: 'settings.textSize.xlarge' },
];
const ROLES: Role[] = ['elder', 'guardian', 'listener'];

export default function SettingsTab() {
  const t = useT();
  const s = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  const engine = hasBackend ? 'settings.engine.backend' : hasDirectLlm ? 'settings.engine.deviceAi' : 'settings.engine.device';

  // The pairing code a guardian types in is issued (and checked) by the server.
  const role = s.role;
  useEffect(() => {
    if (role === 'elder') void refreshPairingCode();
  }, [role]);

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    await resetDemoData();
    s.reset();
    router.replace('/onboarding');
  };

  return (
    <Screen inTabs title={t('settings.title')}>
      <SectionHeader title={t('settings.language')} />
      <LanguagePicker />

      <SectionHeader title={t('settings.textSize')} />
      <View style={styles.chips}>
        {SCALES.map(({ value, key }) => (
          <Chip key={value} label={t(key)} selected={s.textScale === value} onPress={() => s.update({ textScale: value })} />
        ))}
      </View>

      <Card padded={false}>
        <ListRow
          icon="volume-high"
          title={t('settings.voice')}
          subtitle={t('settings.voice.sub')}
          right={<Toggle value={s.voiceEnabled} onChange={(voiceEnabled) => s.update({ voiceEnabled })} label={t('settings.voice')} />}
        />
        <ListRow
          icon="play-circle"
          title={t('settings.voice.test')}
          onPress={() => speak(voiceLineFor('scam', 'digital_arrest', s.lang), { force: true })}
        />
        <ListRow
          icon="pause-circle"
          title={t('settings.pause')}
          subtitle={t('settings.pause.sub')}
          tone={{ color: colors.warn, soft: colors.warnSoft }}
          right={<Toggle value={s.protectionPaused} onChange={(protectionPaused) => s.update({ protectionPaused })} label={t('settings.pause')} />}
        />
        <ListRow
          icon="lock-open"
          title={t('settings.permissions')}
          onPress={() => router.push('/permissions')}
          last
        />
      </Card>

      <SectionHeader title={t('settings.role')} />
      <View style={styles.chips}>
        {ROLES.map((role) => (
          <Chip key={role} label={t(`role.${role}` as StringKey)} selected={s.role === role} onPress={() => s.update({ role })} />
        ))}
      </View>

      <Card padded={false}>
        <ListRow
          icon="people"
          title={t('settings.family')}
          subtitle={s.guardian ? `${s.guardian.name} · ${s.guardian.phone}` : t('settings.family.none')}
          tone={{ color: colors.safe, soft: colors.safeSoft }}
          onPress={() => router.push('/onboarding')}
        />
        <ListRow
          icon="keypad"
          title={t('settings.pairing')}
          right={
            <AppText variant="heading" color={colors.brand}>
              {s.pairingCode.replace(/(\d{3})(\d{3})/, '$1 $2')}
            </AppText>
          }
          last
        />
      </Card>

      <Card padded={false}>
        <ListRow
          icon="flask"
          title={t('settings.demo')}
          subtitle={t('settings.demo.sub')}
          tone={{ color: colors.warn, soft: colors.warnSoft }}
          right={<Toggle value={s.demoMode} onChange={(demoMode) => s.update({ demoMode })} label={t('settings.demo')} />}
        />
        <ListRow
          icon="game-controller"
          title={t('settings.demoRoom')}
          subtitle={t('settings.demoRoom.sub')}
          onPress={() => router.push('/demo')}
          last
        />
      </Card>

      <Card style={styles.privacy}>
        <AppText variant="bodyStrong">{t('settings.privacy')}</AppText>
        <AppText variant="label" color={colors.textMuted}>
          {t('settings.privacy.body')}
        </AppText>
        <AppText variant="caption" color={colors.textFaint}>
          {t('settings.engine')}: {t(engine)}
        </AppText>
      </Card>

      <Button
        label={confirmReset ? t('settings.reset.confirm') : t('settings.reset')}
        icon="trash"
        variant={confirmReset ? 'danger' : 'ghost'}
        onPress={reset}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  privacy: { gap: spacing.xs },
});
