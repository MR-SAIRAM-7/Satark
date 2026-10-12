import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local notifications for alerts raised on this phone. Guardian pushes from the
 * server (Firebase Cloud Messaging) plug in here when the backend lands.
 */
const ALERT_CHANNEL = 'satark-alerts';
const supported = Platform.OS !== 'web';

let ready: Promise<boolean> | null = null;

async function setup(): Promise<boolean> {
  if (!supported) return false;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, {
      name: 'Scam alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export function initNotifications(): Promise<boolean> {
  ready ??= setup().catch(() => false);
  return ready;
}

export async function notify(title: string, body: string, data: Record<string, string> = {}): Promise<void> {
  if (!(await initNotifications())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX },
    trigger: Platform.OS === 'android' ? { channelId: ALERT_CHANNEL } : null,
  }).catch(() => undefined);
}

/** Open the right screen when the user taps a Satark notification. */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  if (!supported) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) =>
    handler(response.notification.request.content.data ?? {}),
  );
  return () => sub.remove();
}
