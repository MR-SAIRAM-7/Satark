import { LANGUAGES, type LangCode } from '@satark/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { speak } from '@/services/voice';
import { useSettings } from '@/store/settings';
import { colors, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Card } from './ui/Card';
import { Chip } from './ui/primitives';

/** Sample line spoken when a language is picked, so the elder hears it before choosing. */
const HELLO: Partial<Record<LangCode, string>> = {
  te: 'నమస్కారం. సతర్క్ మిమ్మల్ని కాపాడుతుంది.',
  hi: 'नमस्ते। सतर्क आपकी रक्षा करेगा।',
  en: 'Hello. Satark will protect you.',
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
 * Language choice. Telugu, Hindi and English have a full interface; the other
 * Sarvam-supported languages get voice warnings with English screens.
 */
export function LanguagePicker({ speakOnSelect = true }: { speakOnSelect?: boolean }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  const [showAll, setShowAll] = useState(() => !LANGUAGES.find((l) => l.code === lang)?.ui);

  const choose = (code: LangCode) => {
    update({ lang: code });
    if (speakOnSelect) speak(HELLO[code] ?? HELLO.en!, { lang: code, force: true });
  };

  const main = LANGUAGES.filter((l) => l.ui);
  const more = LANGUAGES.filter((l) => !l.ui);
  const selected = LANGUAGES.find((l) => l.code === lang);

  return (
    <View style={styles.root}>
      {main.map((l) => (
        <Card
          key={l.code}
          onPress={() => choose(l.code)}
          tone={lang === l.code ? { main: colors.brandBright, soft: colors.brandSoft } : undefined}
          accessibilityLabel={l.english}
          style={styles.option}>
          <AppText variant="title" color={lang === l.code ? colors.brand : colors.text}>
            {l.native}
          </AppText>
          <AppText variant="label" color={colors.textMuted}>
            {l.english}
          </AppText>
        </Card>
      ))}

      {showAll ? (
        <>
          <View style={styles.chips}>
            {more.map((l) => (
              <Chip key={l.code} label={l.native} selected={lang === l.code} onPress={() => choose(l.code)} />
            ))}
          </View>
          {selected && !selected.ui ? (
            <AppText variant="caption" color={colors.textMuted}>
              {t('onb.lang.voiceOnly')}
            </AppText>
          ) : null}
        </>
      ) : (
        <Chip label={t('onb.lang.more')} icon="globe-outline" onPress={() => setShowAll(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md, alignItems: 'stretch' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
