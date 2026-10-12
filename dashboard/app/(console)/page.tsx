'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

import { CampaignList, FeedList, GoldenHourStrip, IndicatorList, KpiRow } from '@/components/panels';
import { Shell } from '@/components/Shell';
import { TrendsChart } from '@/components/TrendsChart';
import { Panel, Skeleton } from '@/components/ui';
import { useRealtime } from '@/lib/realtime';
import type { Campaign, Case, FeedEvent, Indicator, MapPoint, Summary } from '@/lib/types';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => <Skeleton className="h-full min-h-[340px]" /> });

const WINDOWS = [
  { label: '24 h', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: '14 days', hours: 336 },
];

export default function CommandCentre() {
  const [hours, setHours] = useState(168);
  const { live } = useRealtime();
  const { data: summary } = useSWR<Summary>('/dashboard/summary', { refreshInterval: 30_000 });
  const { data: map } = useSWR<{ points: MapPoint[] }>(`/dashboard/map?hours=${hours}`);
  const { data: trends } = useSWR<{ types: string[]; points: ({ at: number } & Record<string, number>)[] }>(`/dashboard/trends?hours=${Math.min(hours, 168)}`);
  const { data: feed } = useSWR<{ events: FeedEvent[] }>('/dashboard/feed?limit=60');
  const { data: campaigns } = useSWR<{ campaigns: Campaign[] }>('/dashboard/campaigns');
  const { data: indicators } = useSWR<{ indicators: Indicator[] }>('/dashboard/indicators?limit=8');
  const { data: golden } = useSWR<{ cases: Case[] }>('/cases?priority=golden_hour', { refreshInterval: 30_000 });
  const { data: weather } = useSWR<{ text: { en: string; te: string; hi: string } }>('/dashboard/weather');
  const [lang, setLang] = useState<'en' | 'te' | 'hi'>('en');

  const events = useMemo(() => {
    const seen = new Set<string>();
    return [...live, ...(feed?.events ?? [])].filter((e) => !seen.has(e.id) && seen.add(e.id)).slice(0, 60);
  }, [live, feed]);

  const filter = (
    <div className="flex shrink-0 whitespace-nowrap rounded-lg bg-raised p-0.5 text-xs" role="group" aria-label="Time range">
      {WINDOWS.map((w) => (
        <button
          key={w.hours}
          onClick={() => setHours(w.hours)}
          aria-pressed={hours === w.hours}
          className={clsx('rounded-md px-2.5 py-1', hours === w.hours ? 'bg-panel font-medium text-ink' : 'text-ink-3 hover:text-ink')}
        >
          {w.label}
        </button>
      ))}
    </div>
  );

  return (
    <Shell title="Command centre" subtitle="Live scam activity reported by Satark users across Hyderabad">
      <div className="space-y-4">
        <KpiRow summary={summary} />
        <GoldenHourStrip cases={golden?.cases ?? []} />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Live scam map"
            subtitle={`${map?.points.reduce((s, p) => s + p.count, 0) ?? '…'} reports by locality · never an exact address`}
            action={filter}
            bodyClassName="h-[420px]"
          >
            <LiveMap points={map?.points ?? []} events={events} />
          </Panel>
          <Panel title="Live feed" subtitle="Checks, reports, cases and alarms as they happen" bodyClassName="h-[420px] overflow-y-auto">
            <FeedList events={events} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Reports over time" subtitle="By scam type · investment and digital-arrest frauds lead Hyderabad's losses" action={filter}>
            {trends ? <TrendsChart types={trends.types} points={trends.points} /> : <Skeleton className="h-64" />}
          </Panel>
          <Panel title="Active campaigns" subtitle="Reports grouped by shared numbers, UPI IDs, links and near-identical text">
            <CampaignList campaigns={campaigns?.campaigns} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="Most-reported identifiers" subtitle="Hashed on every phone; shown masked. Blocked = 3+ independent reports">
            <IndicatorList indicators={indicators?.indicators} />
          </Panel>
          <Panel
            title="Scam weather"
            subtitle="Daily voice note for elders, generated from this data"
            action={
              <div className="flex shrink-0 whitespace-nowrap rounded-lg bg-raised p-0.5 text-xs" role="group" aria-label="Language">
                {(['en', 'te', 'hi'] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={clsx('rounded-md px-2 py-1 uppercase', lang === l ? 'bg-panel text-ink' : 'text-ink-3')}>
                    {l}
                  </button>
                ))}
              </div>
            }
          >
            {weather ? <p className="text-sm leading-relaxed text-ink-2">{weather.text[lang]}</p> : <Skeleton className="h-24" />}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
