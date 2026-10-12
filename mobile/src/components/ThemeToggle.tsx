import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useScheme } from '@/theme/tokens';

import { IconButton } from './ui/Button';

/** One tap between light and dark. The full choice (including "match my phone") is in Settings. */
export function ThemeToggle() {
  const t = useT();
  const scheme = useScheme();
  const update = useSettings((s) => s.update);
  const dark = scheme === 'dark';
  return (
    <IconButton
      testID="theme-toggle"
      icon={dark ? 'sunny-outline' : 'moon-outline'}
      label={t(dark ? 'theme.toLight' : 'theme.toDark')}
      onPress={() => update({ themeMode: dark ? 'light' : 'dark' })}
    />
  );
}
