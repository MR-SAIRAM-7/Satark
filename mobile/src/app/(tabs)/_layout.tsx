import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useT } from '@/i18n';
import { useAlerts } from '@/store/activity';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useT();
  const { c } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const unread = useAlerts((s) => s.alerts.filter((a) => !a.read).length);

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: t('tab.home') }} />
      <Tabs.Screen name="activity" options={{ title: t('tab.activity'), tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="reports" options={{ title: t('tab.reports') }} />
      <Tabs.Screen name="learn" options={{ title: t('tab.learn') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings') }} />
    </Tabs>
  );
}
