import type { StringKey, Translate } from '@/i18n';

/** "Just now", "5m", "3h", "2d" - short enough for a list row in any language. */
export function timeAgo(at: number, t: Translate, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return t('common.now');
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function dayAndTime(at: number): string {
  return new Date(at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "Good morning" / "Good afternoon" / "Good evening" for the home screens. */
export function greetingKey(now = new Date()): StringKey {
  const hour = now.getHours();
  return hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : 'home.evening';
}
