import { LanguagePicker } from '@/components/LanguagePicker';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';

export default function LanguageScreen() {
  const t = useT();
  return (
    <Screen back title={t('settings.language')} subtitle={t('language.sub')}>
      <LanguagePicker />
    </Screen>
  );
}
