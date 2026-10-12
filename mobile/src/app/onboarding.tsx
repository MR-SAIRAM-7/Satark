import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { LanguagePicker } from '@/components/LanguagePicker';
import { PermissionsList } from '@/components/PermissionsList';
import { AppText } from '@/components/ui/AppText';
import { Glow } from '@/components/ui/Glow';
import { Button, tapFeedback, type IconName } from '@/components/ui/Button';
import { Field } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { hasBackend } from '@/config/env';
import { linkFamily } from '@/features/family/sync';
import { useT, type StringKey } from '@/i18n';
import { speak } from '@/services/voice';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
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
  const styles = useStyles();
  const { c, shadow } = useTheme();
  const settings = useSettings();
  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? 'language';

  // On an elder's phone "me" is `elder` and the family member is `guardian`;
  // on a guardian or Home Guardian phone it is the other way round.
  const startedAsElder = settings.role === 'elder';
  const me = startedAsElder ? settings.elder : settings.guardian;
  const family = startedAsElder ? settings.guardian : settings.elder;
  const [name, setName] = useState(me?.name ?? '');
  const [myPhone, setMyPhone] = useState(me?.phone ?? '');
  const [familyName, setFamilyName] = useState(family?.name ?? '');
  const [familyPhone, setFamilyPhone] = useState(family?.phone ?? '');
  const [code, setCode] = useState('');
  const [safeWord, setSafeWord] = useState(settings.safeWord);

  const titles: Record<Step, StringKey> = {
    language: 'onb.lang.title',
    role: 'onb.role.title',
    permissions: 'onb.perm.title',
    family: 'onb.family.title',
  };

  // Every step is read aloud: the elder should never have to read to get protected.
  useEffect(() => {
    if (index > 0) void speak(t(titles[step]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const finish = async () => {
    const elderPhone = settings.role === 'elder';
    const mine = { name: name.trim(), phone: myPhone.trim() };
    const theirs = familyName.trim() || familyPhone.trim() ? { name: familyName.trim(), phone: familyPhone.trim() } : null;
    settings.update({
      onboarded: true,
      elder: elderPhone ? { ...settings.elder, ...mine } : { ...settings.elder, name: theirs?.name ?? '', phone: theirs?.phone ?? '' },
      guardian: elderPhone ? (theirs ? { ...theirs, relation: 'family' } : null) : { ...mine, relation: 'family' },
      safeWord: safeWord.trim(),
    });
    router.replace('/');
    // A guardian or Home Guardian phone joins the elder's alerts with the code from the elder's phone.
    if (!elderPhone && code.replace(/\D/g, '').length === 6) {
      const linked = await linkFamily(code);
      if (linked === 'invalid') useUi.getState().showToast(t('family.linkFailed'), 'warn');
      else if (linked) useUi.getState().showToast(t('family.linked', { name: linked.name || theirs?.name || '' }), 'safe');
    }
  };

  const next = () => (index < STEPS.length - 1 ? setIndex(index + 1) : void finish());
  const isGuardian = settings.role !== 'elder';

  return (
    <Screen
      back={index > 0 ? () => setIndex(index - 1) : settings.onboarded ? goBack : undefined}
      footer={
        <>
          <Button testID="onboarding-next" label={index === STEPS.length - 1 ? t('onb.finish') : t('common.continue')} size="lg" trailingIcon="arrow-forward" onPress={next} />
          {step === 'family' || step === 'permissions' ? <Button label={t('common.skip')} variant="ghost" onPress={next} /> : null}
        </>
      }>
      <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.bar, i <= index && styles.barOn]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(260)} style={styles.step}>
        {step === 'language' ? (
          <View style={[styles.heroWrap, shadow.raised]}>
            <LinearGradient colors={c.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Glow color="#3BE39A" size={340} opacity={0.26} style={styles.glow} />
              <View style={styles.logo}>
                <View style={styles.logoRing} />
                <View style={styles.logoCore}>
                  <Ionicons name="shield-checkmark" size={30} color="#08101F" />
                </View>
              </View>
              <AppText variant="overline" color="rgba(255,255,255,0.7)">
                {t('app.name')} · {t('app.tagline')}
              </AppText>
              <AppText variant="display" color="#FFFFFF">
                {t('onb.welcome.title')}
              </AppText>
              <AppText variant="body" color="rgba(255,255,255,0.78)">
                {t('onb.welcome.body')}
              </AppText>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.titleBlock}>
          <AppText variant="overline" color={c.accentText}>
            {t('onb.step', { n: index + 1, total: STEPS.length })}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {t(titles[step])}
          </AppText>
        </View>

        {step === 'language' ? <LanguagePicker /> : null}

        {step === 'role' ? (
          <View style={styles.list}>
            {ROLES.map(({ role, icon }) => {
              const selected = settings.role === role;
              return (
                <Pressable
                  key={role}
                  testID={`onb-role-${role}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    tapFeedback();
                    settings.update({ role });
                  }}
                  style={({ pressed }) => [styles.role, selected && styles.roleOn, pressed && styles.pressed]}>
                  <View style={[styles.roleIcon, selected && { backgroundColor: c.accent }]}>
                    <Ionicons name={icon} size={26} color={selected ? '#FFFFFF' : c.accentText} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="heading">{t(`onb.role.${role}` as StringKey)}</AppText>
                    <AppText variant="label" color={c.textMuted}>
                      {t(`onb.role.${role}.desc` as StringKey)}
                    </AppText>
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? c.accentText : c.borderStrong} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step === 'permissions' ? (
          <>
            <AppText variant="label" color={c.textMuted}>
              {t('onb.perm.sub')}
            </AppText>
            <PermissionsList />
          </>
        ) : null}

        {step === 'family' ? (
          <View style={styles.list}>
            <AppText variant="body" color={c.textMuted}>
              {t('onb.family.body')}
            </AppText>
            <Field label={t('onb.family.yourName')} value={name} onChangeText={setName} autoCapitalize="words" icon="person-outline" />
            <Field
              label={t('onb.family.yourPhone')}
              hint={t('onb.family.yourPhone.hint')}
              value={myPhone}
              onChangeText={setMyPhone}
              keyboardType="phone-pad"
              placeholder="+91"
              icon="call-outline"
            />
            <View style={styles.divider} />
            <Field label={t('onb.family.name')} value={familyName} onChangeText={setFamilyName} autoCapitalize="words" icon="heart-outline" />
            <Field label={t('onb.family.phone')} value={familyPhone} onChangeText={setFamilyPhone} keyboardType="phone-pad" placeholder="+91" icon="call-outline" />
            <Field label={t('onb.family.safeWord')} hint={t('onb.family.safeWord.hint')} value={safeWord} onChangeText={setSafeWord} icon="key-outline" />
            {isGuardian && hasBackend ? (
              <Field
                label={t('onb.family.code')}
                hint={t('onb.family.code.hint')}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000 000"
                icon="keypad-outline"
              />
            ) : null}
            {isGuardian ? null : (
              <View style={styles.pairHint}>
                <Ionicons name="link" size={20} color={c.accentText} />
                <AppText variant="label" color={c.textMuted} style={styles.flex}>
                  {t('onb.pairLater')}
                </AppText>
              </View>
            )}
          </View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },
  progress: { flexDirection: 'row', gap: 6, paddingTop: spacing.xs },
  bar: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: c.surface3 },
  barOn: { backgroundColor: c.accent },
  step: { gap: spacing.lg },
  heroWrap: { borderRadius: radius.xxl },
  hero: { borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden' },
  glow: { right: -120, top: -130 },
  logo: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  logoRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: 'rgba(59,227,154,0.45)' },
  logoCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3BE39A', alignItems: 'center', justifyContent: 'center' },
  titleBlock: { gap: spacing.xs },
  list: { gap: spacing.md },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  roleOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  roleIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },
  pairHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md + 2, borderRadius: radius.md, backgroundColor: c.accentSoft },
}));
