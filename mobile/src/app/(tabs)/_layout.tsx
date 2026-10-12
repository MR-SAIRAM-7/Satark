import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useAlerts } from '@/store/activity';
import { useSettings } from '@/store/settings';
import { colors } from '@/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/** Filled icon for the selected tab, outline for the rest. */
function icon(active: IconName, idle: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : idle} size={28} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const onboarded = useSettings((s) => s.onboarded);
  const scale = useSettings((s) => s.textScale);
  const unread = useAlerts((s) => s.alerts.filter((a) => !a.read).length);

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandBright,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: Math.round(12 * scale), fontWeight: '700', marginTop: 2 },
        tabBarStyle: {
          height: 66 + insets.bottom + (scale > 1.15 ? 6 : 0),
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab.home'), tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('tab.activity'),
          tabBarIcon: icon('pulse', 'pulse-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
        }}
      />
      <Tabs.Screen name="reports" options={{ title: t('tab.reports'), tabBarIcon: icon('document-text', 'document-text-outline') }} />
      <Tabs.Screen name="learn" options={{ title: t('tab.learn'), tabBarIcon: icon('school', 'school-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
