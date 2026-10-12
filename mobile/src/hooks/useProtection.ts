import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { isNativeAvailable, SatarkNative, type ProtectionStatus } from '@/services/native';
import { useSettings } from '@/store/settings';

export type ProtectionState = 'protected' | 'limited' | 'paused';

export interface Protection {
  state: ProtectionState;
  status: ProtectionStatus;
  /** False in Expo Go and on the web, where the Kotlin module is not installed. */
  nativeAvailable: boolean;
  refresh: () => void;
}

/** Live view of the Android permissions that automatic protection depends on. */
export function useProtection(): Protection {
  const paused = useSettings((s) => s.protectionPaused);
  const demoMode = useSettings((s) => s.demoMode);
  const [status, setStatus] = useState<ProtectionStatus>(() => SatarkNative.getStatus());

  const refresh = useCallback(() => setStatus(SatarkNative.getStatus()), []);

  // Permissions are granted in system settings, so re-read them whenever the app returns.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  let state: ProtectionState;
  if (paused) state = 'paused';
  else if (isNativeAvailable) state = status.notificationAccess ? 'protected' : 'limited';
  // Without the native module, the demo simulator stands in for the listeners.
  else state = demoMode ? 'protected' : 'limited';

  return { state, status, nativeAvailable: isNativeAvailable, refresh };
}
