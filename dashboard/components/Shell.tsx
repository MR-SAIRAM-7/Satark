'use client';

import clsx from 'clsx';
import {
  BellOff,
  BellRing,
  Briefcase,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Radar,
  Send,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { session, type Officer } from '@/lib/api';
import { clock } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';

import { AlarmBanner } from './AlarmBanner';
import { DemoMenu } from './DemoMenu';

const NAV = [
  { href: '/', label: 'Command centre', icon: LayoutDashboard },
  { href: '/cases', label: 'Case queue', icon: Briefcase },
  { href: '/intel', label: 'Threat intel', icon: Radar },
  { href: '/analyzer', label: 'Explainable AI', icon: FlaskConical },
  { href: '/outbox', label: 'Automated messages', icon: Send },
];

export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, muted, setMuted, soundOn, enableSound } = useRealtime();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setOfficer(session.user());
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-panel lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="grid size-9 place-items-center rounded-lg bg-accent-strong">
            <ShieldCheck aria-hidden className="size-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Satark</div>
            <div className="text-[11px] text-ink-3">Cyber Cell · Hyderabad</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-raised font-medium text-ink' : 'text-ink-2 hover:bg-raised/60 hover:text-ink',
                )}
              >
                <Icon aria-hidden className={clsx('size-4', active ? 'text-accent' : 'text-ink-3')} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 lg:block">
          <div className="text-sm font-medium">{officer?.name ?? 'Officer'}</div>
          <div className="text-xs text-ink-3">{officer?.badge}</div>
          <div className="mt-0.5 text-xs text-ink-3">{officer?.station}</div>
          <button
            onClick={() => {
              session.clear();
              router.replace('/login');
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink"
          >
            <LogOut aria-hidden className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AlarmBanner />
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-raised px-2.5 py-1.5 text-xs text-ink-2">
              <span aria-hidden className={clsx('size-2 rounded-full', connected ? 'bg-good' : 'bg-ink-3')} />
              {connected ? 'Live' : 'Connecting…'}
              {now && <span className="tabular text-ink-3">· {clock(now)}</span>}
            </span>
            {!soundOn ? (
              <button onClick={() => void enableSound()} className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                <Volume2 aria-hidden className="size-3.5" /> Enable alarm sound
              </button>
            ) : (
              <button
                onClick={() => setMuted(!muted)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-raised px-2.5 py-1.5 text-xs text-ink-2 hover:text-ink"
                aria-pressed={!muted}
              >
                {muted ? <BellOff aria-hidden className="size-3.5" /> : <BellRing aria-hidden className="size-3.5 text-good" />}
                {muted ? 'Alarm muted' : 'Alarm on'}
              </button>
            )}
            <DemoMenu />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
