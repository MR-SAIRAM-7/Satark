import { PermissionsList } from '@/components/PermissionsList';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';

export default function PermissionsScreen() {
  const t = useT();
  return (
    <Screen back title={t('settings.permissions')} subtitle={t('onb.perm.sub')}>
      <PermissionsList />
    </Screen>
  );
}
