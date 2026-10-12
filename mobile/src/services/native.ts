import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * Bridge to the Kotlin `SatarkNative` module (modules/satark-native).
 *
 * The module only exists in a development or release build made with EAS.
 * In Expo Go and on the web it is absent, so every call here degrades to a
 * safe no-op and the app stays usable through "Is this safe?" and demo mode.
 */

export interface NativeNotification {
  /** Android package, e.g. "com.whatsapp". */
  app: string;
  sender: string;
  text: string;
  postedAt: number;
}

export interface NativeCallEvent {
  number: string;
  /** "blocked": rejected before ringing. "ringing" | "offhook" | "idle": call state. */
  state: 'blocked' | 'ringing' | 'offhook' | 'idle';
  at: number;
}

export interface ProtectionStatus {
  notificationAccess: boolean;
  callScreening: boolean;
  overlay: boolean;
  batteryUnrestricted: boolean;
  serviceRunning: boolean;
}

interface Subscription {
  remove: () => void;
}

interface SatarkNativeModule {
  getStatus(): ProtectionStatus;
  openNotificationAccessSettings(): void;
  requestCallScreeningRole(): Promise<boolean>;
  openOverlaySettings(): void;
  requestIgnoreBatteryOptimizations(): void;
  startProtectionService(title: string, text: string): void;
  stopProtectionService(): void;
  setProtectionPaused(paused: boolean): void;
  /** Hashes of community-reported numbers, kept in native storage for pre-ring blocking. */
  syncReportedHashes(hashes: string[]): void;
  /** Events captured while the JS runtime was not running. */
  drainPendingNotifications(): NativeNotification[];
  endCall(): Promise<boolean>;
  showCallOverlay(title: string, body: string, safeLabel: string, seconds: number): void;
  hideCallOverlay(): void;
  addListener(event: 'onNotification', listener: (e: NativeNotification) => void): Subscription;
  addListener(event: 'onCall', listener: (e: NativeCallEvent) => void): Subscription;
  addListener(event: 'onOverlayResult', listener: (e: { cut: boolean }) => void): Subscription;
}

const native =
  Platform.OS === 'android' ? requireOptionalNativeModule<SatarkNativeModule>('SatarkNative') : null;

export const isNativeAvailable = native !== null;

const NO_STATUS: ProtectionStatus = {
  notificationAccess: false,
  callScreening: false,
  overlay: false,
  batteryUnrestricted: false,
  serviceRunning: false,
};
const NO_SUBSCRIPTION: Subscription = { remove: () => undefined };

/** Run a native call, returning `fallback` if the module is missing or throws. */
function safe<T>(fn: (m: SatarkNativeModule) => T, fallback: T): T {
  if (!native) return fallback;
  try {
    return fn(native);
  } catch {
    return fallback;
  }
}

export const SatarkNative = {
  getStatus: () => safe((m) => m.getStatus(), NO_STATUS),
  openNotificationAccessSettings: () => safe((m) => m.openNotificationAccessSettings(), undefined),
  requestCallScreeningRole: () => safe((m) => m.requestCallScreeningRole(), Promise.resolve(false)),
  openOverlaySettings: () => safe((m) => m.openOverlaySettings(), undefined),
  requestIgnoreBatteryOptimizations: () => safe((m) => m.requestIgnoreBatteryOptimizations(), undefined),
  startProtectionService: (title: string, text: string) => safe((m) => m.startProtectionService(title, text), undefined),
  stopProtectionService: () => safe((m) => m.stopProtectionService(), undefined),
  setProtectionPaused: (paused: boolean) => safe((m) => m.setProtectionPaused(paused), undefined),
  syncReportedHashes: (hashes: string[]) => safe((m) => m.syncReportedHashes(hashes), undefined),
  drainPendingNotifications: () => safe((m) => m.drainPendingNotifications(), [] as NativeNotification[]),
  endCall: () => safe((m) => m.endCall(), Promise.resolve(false)),
  showCallOverlay: (title: string, body: string, safeLabel: string, seconds: number) =>
    safe((m) => m.showCallOverlay(title, body, safeLabel, seconds), undefined),
  hideCallOverlay: () => safe((m) => m.hideCallOverlay(), undefined),

  onNotification: (listener: (e: NativeNotification) => void) =>
    safe((m) => m.addListener('onNotification', listener), NO_SUBSCRIPTION),
  onCall: (listener: (e: NativeCallEvent) => void) => safe((m) => m.addListener('onCall', listener), NO_SUBSCRIPTION),
  onOverlayResult: (listener: (e: { cut: boolean }) => void) =>
    safe((m) => m.addListener('onOverlayResult', listener), NO_SUBSCRIPTION),
};

/** Apps whose notifications Satark reads. Everything else is ignored in native code. */
export const WATCHED_APPS: Record<string, 'whatsapp' | 'sms'> = {
  'com.whatsapp': 'whatsapp',
  'com.whatsapp.w4b': 'whatsapp',
  'com.google.android.apps.messaging': 'sms',
  'com.samsung.android.messaging': 'sms',
  'com.android.mms': 'sms',
  'com.miui.mms': 'sms',
  'com.oneplus.mms': 'sms',
  'com.coloros.mms': 'sms',
  'com.vivo.mms': 'sms',
  'com.truecaller': 'sms',
};
