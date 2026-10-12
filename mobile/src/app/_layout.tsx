import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppBridge } from '@/components/AppBridge';
import { ToastHost } from '@/components/ToastHost';
import { useHydrated } from '@/store/hydration';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  // Hold the splash screen until settings are loaded, so the app never flashes the wrong language.
  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="verdict/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="txn-alert" options={{ animation: 'fade_from_bottom' }} />
        {/* The countdown must not be swiped away by accident. */}
        <Stack.Screen name="call-alert" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <AppBridge />
      <ToastHost />
    </>
  );
}
