import Ionicons from '@expo/vector-icons/Ionicons';
import { isTranslatedBySarvam, LANGUAGES, type LangCode } from '@satark/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { ensureLanguagePack } from '@/services/translation';
import { speak } from '@/services/voice';
import { useLangPacks } from '@/store/langPacks';
import { useSettings } from '@/store/settings';
import { colors, radius, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Card } from './ui/Card';
import { Chip } from './ui/primitives';

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
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  const status = useLangPacks((s) => s.status[lang]);
  const [showAll, setShowAll] = useState(() => isTranslatedBySarvam(lang));

  const choose = (code: LangCode) => {
    update({ lang: code });
    ensureLanguagePack(code);
    if (speakOnSelect) speak(HELLO[code], { lang: code, force: true });
  };

  const main = LANGUAGES.filter((l) => l.ui);
  const more = LANGUAGES.filter((l) => !l.ui);

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
          {l.native === l.english ? null : (
            <AppText variant="label" color={colors.textMuted}>
              {l.english}
            </AppText>
          )}
        </Card>
      ))}

      {showAll ? (
        <View style={styles.chips}>
          {more.map((l) => (
            <Chip key={l.code} label={l.native} selected={lang === l.code} onPress={() => choose(l.code)} />
          ))}
        </View>
      ) : (
        <Chip label={t('onb.lang.more')} icon="globe-outline" onPress={() => setShowAll(true)} />
      )}

      {isTranslatedBySarvam(lang) ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={colors.brandBright} />
          ) : (
            <Ionicons
              name={status === 'unavailable' ? 'cloud-offline' : 'sparkles'}
              size={18}
              color={status === 'unavailable' ? colors.warn : colors.brandBright}
            />
          )}
          <AppText variant="caption" color={status === 'unavailable' ? colors.warnDeep : colors.brand} style={styles.statusText}>
            {t(status === 'loading' ? 'lang.translating' : status === 'unavailable' ? 'lang.unavailable' : 'lang.ready')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md, alignItems: 'stretch' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: spacing.md },
  statusText: { flex: 1 },
});
