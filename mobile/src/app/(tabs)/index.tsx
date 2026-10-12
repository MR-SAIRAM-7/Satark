import { Redirect } from 'expo-router';

import { ElderHome } from '@/screens/home/ElderHome';
import { GuardianHome } from '@/screens/home/GuardianHome';
import { useSettings } from '@/store/settings';

/** Home adapts to who uses this phone: elder, guardian, or a Home Guardian listener. */
export default function HomeTab() {
  const role = useSettings((s) => s.role);
  if (role === 'guardian') return <GuardianHome />;
  if (role === 'listener') return <Redirect href="/listener" />;
  return <ElderHome />;
}
