'use client';

import { AlertOctagon } from 'lucide-react';

import { ago } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';

/** Critical events stay on screen, flashing, until an officer acknowledges them. */
export function AlarmBanner() {
  const { alarms, acknowledgeAlarms } = useRealtime();
  if (alarms.length === 0) return null;
  const [latest] = alarms;
  return (
    <div role="alert" className="alarm-flash flex flex-wrap items-center gap-3 px-4 py-2.5 text-white lg:px-6">
      <AlertOctagon aria-hidden className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          CRITICAL · {latest!.title}
          {alarms.length > 1 && <span className="font-normal opacity-85"> (+{alarms.length - 1} more)</span>}
        </div>
        <div className="truncate text-xs opacity-90">
          {latest!.detail}
          {latest!.locality ? ` · ${latest!.locality}` : ''} · {ago(latest!.createdAt)}
        </div>
      </div>
      <button onClick={acknowledgeAlarms} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-critical hover:bg-white/90">
        Acknowledge
      </button>
    </div>
  );
}
