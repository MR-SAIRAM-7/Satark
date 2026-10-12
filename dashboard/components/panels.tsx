'use client';

import clsx from 'clsx';
import {
  Banknote,
  Bell,
  Briefcase,
  Flag,
  Info,
  Landmark,
  MessageSquareWarning,
  PhoneOff,
  ShieldAlert,
  ShieldBan,
  Siren,
  Timer,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ago, compactInr, IOC_LABEL, scamLabel, seriesColor, STAGE_LABEL } from '@/lib/format';
import type { Campaign, Case, FeedEvent, Indicator, Summary } from '@/lib/types';

import { Chip, Empty, SeverityBadge, Skeleton, StatTile } from './ui';

export function KpiRow({ summary }: { summary?: Summary }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 min-[1700px]:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 min-[1700px]:grid-cols-8">
      <StatTile label="Golden-hour cases" value={summary.goldenHour} context="money still recoverable" tone={summary.goldenHour ? 'critical' : 'default'} icon={Timer} />
      <StatTile label="Money at risk" value={compactInr(summary.amountAtRisk)} context="open cases, not yet held" icon={Banknote} />
      <StatTile label="Held by banks" value={compactInr(summary.amountHeld)} context="lien marked after reports" tone="good" icon={Landmark} />
      <StatTile label="Scams caught · 24 h" value={summary.scams} context={`of ${summary.checks} messages checked`} icon={ShieldAlert} />
      <StatTile label="Reports · 24 h" value={summary.reports} context="from Satark users" icon={Flag} />
      <StatTile label="Unanswered alerts" value={summary.unacked} context="critical, family not responded" tone={summary.unacked ? 'critical' : 'default'} icon={Siren} />
      <StatTile label="Open cases" value={summary.openCases} context="in the cyber cell queue" icon={Briefcase} />
      <StatTile label="Blocklisted" value={summary.confirmedIocs} context={`${summary.protectedElders} elders protected`} icon={ShieldBan} />
    </div>
  );
}

const FEED_ICON: Record<FeedEvent['type'], LucideIcon> = {
  check: MessageSquareWarning,
  report: Flag,
  case: Briefcase,
  alert: Bell,
  call: PhoneOff,
  escalation: Siren,
  ioc: ShieldBan,
  system: Info,
};

export function FeedList({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) return <Empty>Waiting for activity…</Empty>;
  return (
    <ol className="divide-y divide-line">
      {events.map((e) => {
        const Icon = FEED_ICON[e.type] ?? Info;
        return (
          <li key={e.id} className={clsx('flex gap-3 px-4 py-2.5', e.severity === 'critical' && 'bg-critical/8')}>
            <Icon aria-hidden className={clsx('mt-0.5 size-4 shrink-0', e.severity === 'critical' ? 'text-critical' : e.severity === 'warning' ? 'text-warning' : 'text-ink-3')} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-snug text-ink">{e.title}</p>
                <time className="shrink-0 text-[11px] text-ink-3" dateTime={e.createdAt}>
                  {ago(e.createdAt)}
                </time>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                {e.severity === 'critical' && <SeverityBadge severity="critical" />}
                {e.scamType && e.scamType !== 'unknown' && <Chip color={seriesColor(e.scamType)}>{scamLabel(e.scamType)}</Chip>}
                {e.locality && <span>{e.locality}</span>}
                {e.detail && <span className="truncate">· {e.detail}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Cases where money left in the last hour: every minute counts for a bank hold. */
export function GoldenHourStrip({ cases }: { cases: Case[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const live = cases.filter((c) => c.goldenHourEndsAt && new Date(c.goldenHourEndsAt).getTime() > now);
  if (live.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {live.map((c) => {
        const left = Math.max(0, Math.round((new Date(c.goldenHourEndsAt!).getTime() - now) / 60_000));
        return (
          <Link
            key={c.id}
            href={`/cases?id=${c.id}`}
            className="flex items-center gap-4 rounded-xl border border-critical/50 bg-critical/10 px-4 py-3 transition-colors hover:bg-critical/15"
          >
            <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-critical text-center">
              <div>
                <div className="tabular text-lg font-bold leading-none">{left}</div>
                <div className="text-[10px] text-ink-2">min left</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SeverityBadge severity="critical" label="Golden hour" />
                <span className="font-mono text-xs text-ink-2">{c.ref}</span>
              </div>
              <div className="mt-1 truncate text-sm font-medium">
                {c.transaction?.amount ? compactInr(c.transaction.amount) : '-'} · {scamLabel(c.scamType)}
              </div>
              <div className="truncate text-xs text-ink-3">
                {c.elder?.name} · {c.locality} · {STAGE_LABEL[c.stage]}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function CampaignList({ campaigns }: { campaigns?: Campaign[] }) {
  if (!campaigns) return <Skeleton className="h-48" />;
  if (campaigns.length === 0) return <Empty>No active campaigns.</Empty>;
  return (
    <ul className="space-y-2">
      {campaigns.slice(0, 6).map((c) => (
        <li key={c.id} className="rounded-lg border border-line bg-page/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: seriesColor(c.scamType) }} />
              <span className="truncate text-sm font-medium">{c.label}</span>
            </div>
            <span className="tabular shrink-0 text-sm font-semibold">{c.reportCount}</span>
          </div>
          {c.sampleText && <p className="mt-1.5 line-clamp-2 text-xs text-ink-3">“{c.sampleText}”</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
            {c.localities.slice(0, 4).map((l) => (
              <Chip key={l}>{l}</Chip>
            ))}
            <span className="ml-auto">
              {c.iocCount} identifiers · last {ago(c.lastSeen)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IndicatorList({ indicators }: { indicators?: Indicator[] }) {
  if (!indicators) return <Skeleton className="h-48" />;
  const max = Math.max(1, ...indicators.map((i) => i.reportCount));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Most-reported scam identifiers</caption>
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3">
          <th className="pb-2 font-medium">Identifier</th>
          <th className="pb-2 font-medium">Type</th>
          <th className="w-1/3 pb-2 font-medium">Reports</th>
          <th className="pb-2 text-right font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {indicators.map((i) => (
          <tr key={`${i.type}:${i.masked}`}>
            <td className="py-2 pr-2 font-mono text-xs">{i.masked}</td>
            <td className="py-2 pr-2 text-xs text-ink-2">{IOC_LABEL[i.type]}</td>
            <td className="py-2 pr-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-raised">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(i.reportCount / max) * 100}%` }} />
                </div>
                <span className="tabular w-7 text-right text-xs">{i.reportCount}</span>
              </div>
            </td>
            <td className="py-2 text-right">
              <span className={clsx('inline-flex items-center gap-1 text-xs', i.status === 'confirmed' ? 'text-ink' : 'text-ink-3')}>
                {i.status === 'confirmed' ? <ShieldBan aria-hidden className="size-3.5" /> : <UsersRound aria-hidden className="size-3.5" />}
                {i.status === 'confirmed' ? 'Blocked' : 'Suspected'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
