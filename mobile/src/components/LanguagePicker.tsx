import Ionicons from '@expo/vector-icons/Ionicons';
import { isTranslatedBySarvam, LANGUAGES, type LangCode } from '@satark/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useT } from '@/i18n';
import { ensureLanguagePack } from '@/services/translation';
import { speak } from '@/services/voice';
import { useLangPacks } from '@/store/langPacks';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { tapFeedback } from './ui/Button';

/** Sample line spoken when a language is picked, so the user hears it before choosing. */
const HELLO: Record<LangCode, string> = {
  en: 'Hello. Satark will protect you.',
  te: 'నమస్కారం. సతర్క్ మిమ్మల్ని కాపాడుతుంది.',
  hi: 'नमस्ते। सतर्क आपकी रक्षा करेगा।',
  ta: 'வணக்கம். சதர்க் உங்களைப் பாதுகாக்கும்.',
  kn: 'ನಮಸ್ಕಾರ. ಸತರ್ಕ್ ನಿಮ್ಮನ್ನು ರಕ್ಷಿಸುತ್ತದೆ.',
  ml: 'നമസ്കാരം. സതർക്ക് നിങ്ങളെ സംരക്ഷിക്കും.',
  mr: 'नमस्कार. सतर्क तुमचे रक्षण करेल.',
  bn: 'নমস্কার। সতর্ক আপনাকে রক্ষা করবে।',
  gu: 'નમસ્તે. સતર્ક તમારું રક્ષણ કરશે.',
  pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਸਤਰਕ ਤੁਹਾਡੀ ਰੱਖਿਆ ਕਰੇਗਾ।',
  or: 'ନମସ୍କାର। ସତର୍କ ଆପଣଙ୍କୁ ସୁରକ୍ଷା ଦେବ।',
};

/**
 * Language choice. English is the default; Telugu and Hindi are built in; any
 * other language is translated by Sarvam AI when picked, then kept on the phone.
 */
export function LanguagePicker({ speakOnSelect = true }: { speakOnSelect?: boolean }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  const status = useLangPacks((s) => s.status[lang]);
  const [showAll, setShowAll] = useState(() => isTranslatedBySarvam(lang));

  const choose = (code: LangCode) => {
    tapFeedback();
    update({ lang: code });
    ensureLanguagePack(code);
    if (speakOnSelect) void speak(HELLO[code], { lang: code, force: true });
  };

  const main = LANGUAGES.filter((l) => l.ui);
  const more = LANGUAGES.filter((l) => !l.ui);
  const shown = showAll ? [...main, ...more] : main;

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        {shown.map((l) => {
          const selected = lang === l.code;
          return (
            <Pressable
              key={l.code}
              testID={`lang-${l.code}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={l.english}
              onPress={() => choose(l.code)}
              style={({ pressed }) => [styles.option, l.ui && styles.optionMain, selected && styles.optionOn, pressed && styles.pressed]}>
              <View style={styles.flex}>
                <AppText variant={l.ui ? 'heading' : 'bodyStrong'} color={selected ? c.accentText : c.text} numberOfLines={1}>
                  {l.native}
                </AppText>
                {l.native === l.english ? null : (
                  <AppText variant="caption" color={c.textMuted}>
                    {l.english}
                  </AppText>
                )}
              </View>
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? c.accentText : c.borderStrong} />
            </Pressable>
          );
        })}
      </View>

      {showAll ? null : (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={styles.more}>
          <Ionicons name="globe-outline" size={18} color={c.accentText} />
          <AppText variant="label" color={c.accentText}>
            {t('onb.lang.more')}
          </AppText>
        </Pressable>
      )}

      {isTranslatedBySarvam(lang) ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={c.accentText} />
          ) : (
            <Ionicons name={status === 'unavailable' ? 'cloud-offline' : 'sparkles'} size={18} color={status === 'unavailable' ? c.warnText : c.accentText} />
          )}
          <AppText variant="caption" color={status === 'unavailable' ? c.warnText : c.accentText} style={styles.flex}>
            {t(status === 'loading' ? 'lang.translating' : status === 'unavailable' ? 'lang.unavailable' : 'lang.ready')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  root: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  optionMain: { flexBasis: '100%', minHeight: 72 },
  optionOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
  pressed: { transform: [{ scale: 0.98 }] },
  more: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs + 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.accentSoft, borderRadius: radius.md, padding: spacing.md },
}));
