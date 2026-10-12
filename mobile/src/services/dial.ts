import { router } from 'expo-router';
import { Linking } from 'react-native';

import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';

export interface DialOptions {
  name: string;
  /** Family calls are always real. Helplines and banks go to the practice dialer in demo mode. */
  family?: boolean;
  /** Complaint whose 1930 script card should be shown alongside the call. */
  complaintId?: string;
}

/**
 * Place a call. In demo mode, calls to 1930, banks and other helplines open
 * Satark's own practice dialer: nothing reaches a real service (F8).
 */
export function dial(number: string, { name, family, complaintId }: DialOptions): void {
  const digits = number.replace(/[^\d+]/g, '');
  if (!digits) {
    useUi.getState().showToast(name, 'warn');
    return;
  }
  if (useSettings.getState().demoMode && !family) {
    router.push({ pathname: '/mock/dialer', params: { number, name, complaintId: complaintId ?? '' } });
    return;
  }
  Linking.openURL(`tel:${digits}`).catch(() => useUi.getState().showToast(number, 'warn'));
}
