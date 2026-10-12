import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppRegistry, Platform } from 'react-native';

import { syncCommunity } from '@/features/detection/community';
import { processIncoming } from '@/features/detection/pipeline';
import { WATCHED_APPS, type NativeNotification } from '@/services/native';
import { whenHydrated } from '@/store/hydration';

/**
 * Background work. Imported once from index.ts, before the UI, because both
 * registrations must exist when Android starts the JS runtime without a screen.
 *
 * How Satark keeps protecting 24/7:
 *  1. Android itself keeps `SatarkNotificationListener` bound for as long as
 *     notification access is granted, including after a reboot.
 *  2. A foreground service with a permanent notification stops aggressive
 *     battery managers (Xiaomi, Realme, Vivo, Oppo) from killing the process.
 *  3. When a watched notification arrives and the app is not open, the listener
 *     starts the headless task below, which runs the same pipeline as the UI.
 *  4. A periodic background task refreshes the community blocklist, so
 *     pre-ring call blocking stays current even if the app is never opened.
 */

export const HEADLESS_NOTIFICATION_TASK = 'SatarkNotificationTask';
export const SYNC_TASK = 'satark-community-sync';

/** Turn a captured Android notification into a pipeline item, or null if it is not from a watched app. */
export function toIncoming(event: NativeNotification) {
  const source = WATCHED_APPS[event.app];
  if (!source || !event.text?.trim()) return null;
  return { source, sender: event.sender, text: event.text, app: event.app, receivedAt: event.postedAt };
}

if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask(HEADLESS_NOTIFICATION_TASK, () => async (event: NativeNotification) => {
    await whenHydrated();
    const item = toIncoming(event);
    if (item) await processIncoming(item);
  });
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(SYNC_TASK, async () => {
    try {
      await whenHydrated();
      await syncCommunity();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Ask the OS to run the blocklist sync roughly every 15 minutes (the platform minimum). */
export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(SYNC_TASK))) {
      await BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: 15 });
    }
  } catch {
    // Background tasks are unavailable in Expo Go; the foreground sync still runs.
  }
}
