import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { LanguagePicker } from '@/components/LanguagePicker';
import { PermissionsList } from '@/components/PermissionsList';
import { AppText } from '@/components/ui/AppText';
import { Button, type IconName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, IconBadge } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { useT, type StringKey } from '@/i18n';
import { speak } from '@/services/voice';
import { useSettings } from '@/store/settings';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Role } from '@/types';

type Step = 'language' | 'role' | 'permissions' | 'family';
const STEPS: Step[] = ['language', 'role', 'permissions', 'family'];

const ROLES: { role: Role; icon: IconName }[] = [
  { role: 'elder', icon: 'shield-checkmark' },
  { role: 'guardian', icon: 'people' },
  { role: 'listener', icon: 'mic' },
];

/** First run: language, who uses this phone, consent for each permission, family link. */
export default function Onboarding() {
  const t = useT();
  const settings = useSettings();
  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? 'language';

  const [name, setName] = useState(settings.elder.name);
  const [familyName, setFamilyName] = useState(settings.guardian?.name ?? '');
  const [familyPhone, setFamilyPhone] = useState(settings.guardian?.phone ?? '');
  const [safeWord, setSafeWord] = useState(settings.safeWord);

  const titles: Record<Step, StringKey> = {
    language: 'onb.lang.title',
    role: 'onb.role.title',
    permissions: 'onb.perm.title',
    family: 'onb.family.title',
  };

  // Every step is read aloud: the elder should never have to read to get protected.
  useEffect(() => {
    if (index > 0) speak(t(titles[step]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const finish = () => {
    settings.update({
      onboarded: true,
      elder: { ...settings.elder, name: name.trim() },
      guardian: familyName.trim() ? { name: familyName.trim(), phone: familyPhone.trim(), relation: 'family' } : null,
      safeWord: safeWord.trim(),
    });
    router.replace('/');
  };

  const next = () => (index < STEPS.length - 1 ? setIndex(index + 1) : finish());
  const isGuardian = settings.role === 'guardian';

  return (
    <Screen
      back={index > 0 ? () => setIndex(index - 1) : settings.onboarded ? goBack : undefined}
      footer={
        <>
          <Button testID="onboarding-next" label={index === STEPS.length - 1 ? t('onb.finish') : t('common.continue')} size="lg" icon="arrow-forward" onPress={next} />
          {step === 'family' || step === 'permissions' ? <Button label={t('common.skip')} variant="ghost" onPress={next} /> : null}
        </>
      }>
      <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, i <= index && styles.dotActive]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(240)} style={styles.step}>
        {step === 'language' ? (
          <LinearGradient colors={['#1F6FEB', '#143A6E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={44} color={colors.brandBright} />
            </View>
            <AppText variant="title" color={colors.textOnDark} center>
              {t('onb.welcome.title')}
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.92)" center>
              {t('onb.welcome.body')}
            </AppText>
          </LinearGradient>
        ) : null}

        <AppText variant="title" accessibilityRole="header">
          {t(titles[step])}
        </AppText>

        {step === 'language' ? <LanguagePicker /> : null}

        {step === 'role' ? (
          <View style={styles.list}>
            {ROLES.map(({ role, icon }) => {
              const selected = settings.role === role;
              return (
                <Card
                  key={role}
                  onPress={() => settings.update({ role })}
                  tone={selected ? { main: colors.brandBright, soft: colors.brandSoft } : undefined}
                  style={styles.role}>
                  <IconBadge name={icon} size={56} soft={selected ? colors.surface : colors.brandSoft} />
                  <View style={styles.flex}>
                    <AppText variant="heading">{t(`onb.role.${role}` as StringKey)}</AppText>
                    <AppText variant="label" color={colors.textMuted}>
                      {t(`onb.role.${role}.desc` as StringKey)}
                    </AppText>
                  </View>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={26} color={selected ? colors.brandBright : colors.textFaint} />
                </Card>
              );
            })}
          </View>
        ) : null}

        {step === 'permissions' ? (
          <>
            <AppText variant="label" color={colors.textMuted}>
              {t('onb.perm.sub')}
            </AppText>
            <PermissionsList />
          </>
        ) : null}

        {step === 'family' ? (
          <View style={styles.list}>
            <AppText variant="body" color={colors.textMuted}>
              {t('onb.family.body')}
            </AppText>
            <Field label={t('onb.family.yourName')} value={name} onChangeText={setName} autoCapitalize="words" />
            <Field label={t('onb.family.name')} value={familyName} onChangeText={setFamilyName} autoCapitalize="words" />
            <Field label={t('onb.family.phone')} value={familyPhone} onChangeText={setFamilyPhone} keyboardType="phone-pad" placeholder="+91" />
            <Field label={t('onb.family.safeWord')} hint={t('onb.family.safeWord.hint')} value={safeWord} onChangeText={setSafeWord} />
            {isGuardian ? null : (
              <Card style={styles.code} tone={{ main: colors.brandBright, soft: colors.brandSoft }}>
                <AppText variant="label" color={colors.textMuted}>
                  {t('onb.code.title')}
                </AppText>
                <AppText variant="display" color={colors.brand} style={styles.codeText}>
                  {settings.pairingCode.replace(/(\d{3})(\d{3})/, '$1 $2')}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {t('onb.code.body')}
                </AppText>
              </Card>
            )}
          </View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dots: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  dot: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brandBright },
  step: { gap: spacing.lg },
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  logo: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.textOnDark, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.md },
  role: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  code: { alignItems: 'center', gap: spacing.xs },
  codeText: { letterSpacing: 6 },
});
