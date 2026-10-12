'use client';

import clsx from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import useSWR from 'swr';

import { CaseDrawer } from '@/components/CaseDrawer';
import { Shell } from '@/components/Shell';
import { Chip, Empty, Panel, SeverityBadge, Skeleton } from '@/components/ui';
import { ago, compactInr, FIR_STAGES, scamLabel, seriesColor, STAGE_LABEL, stageIndex } from '@/lib/format';
import type { Case } from '@/lib/types';

const FILTERS = [
  { key: 'open', label: 'Open', query: '?open=1' },
  { key: 'golden', label: 'Golden hour', query: '?priority=golden_hour' },
  { key: 'high', label: 'Money lost', query: '?priority=high' },
  { key: 'all', label: 'All', query: '' },
];

function StageBar({ stage }: { stage: Case['stage'] }) {
  const reached = stageIndex(stage);
  return (
    <div className="flex items-center gap-1" aria-label={`Stage ${reached + 1} of ${FIR_STAGES.length}: ${STAGE_LABEL[stage]}`}>
      {FIR_STAGES.map((s, i) => (
        <span key={s} className={clsx('h-1.5 w-4 rounded-full', i <= reached ? 'bg-accent' : 'bg-raised')} />
      ))}
      <span className="ml-1.5 text-xs text-ink-2">{STAGE_LABEL[stage]}</span>
    </div>
  );
}

function CaseQueue() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get('id');
  const [filter, setFilter] = useState('open');
  const { data } = useSWR<{ cases: Case[] }>(`/cases${FILTERS.find((f) => f.key === filter)!.query}`, { refreshInterval: 30_000 });

  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_520px]">
      <Panel
        title="Cases filed by Satark"
        subtitle="Filed automatically with the Complaint Kit. Every stage you set is sent to the victim and family on WhatsApp."
        action={
          <div className="flex shrink-0 whitespace-nowrap rounded-lg bg-raised p-0.5 text-xs" role="group" aria-label="Filter cases">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={clsx('rounded-md px-2.5 py-1', filter === f.key ? 'bg-panel font-medium text-ink' : 'text-ink-3 hover:text-ink')}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        bodyClassName="overflow-x-auto"
      >
        {!data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.cases.length === 0 ? (
          <Empty>No cases in this view.</Empty>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2 font-medium">Case</th>
                <th className="px-2 py-2 font-medium">Victim</th>
                <th className="px-2 py-2 font-medium">Scam</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Progress</th>
                <th className="px-4 py-2 text-right font-medium">Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.cases.map((c) => {
                const golden = c.priority === 'golden_hour' && c.goldenHourEndsAt && new Date(c.goldenHourEndsAt).getTime() > Date.now();
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.replace(`/cases?id=${c.id}`, { scroll: false })}
                    className={clsx('cursor-pointer transition-colors hover:bg-raised/60', selected === c.id && 'bg-raised', golden && 'bg-critical/6')}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs">{c.ref}</div>
                      <div className="mt-1">
                        {golden ? (
                          <SeverityBadge severity="critical" label="Golden hour" />
                        ) : c.priority === 'high' ? (
                          <SeverityBadge severity="warning" label="Money lost" />
                        ) : (
                          <span className="text-xs text-ink-3">Attempt</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div>{c.elder?.name || 'Anonymous'}</div>
                      <div className="text-xs text-ink-3">{c.locality}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <Chip color={seriesColor(c.scamType)}>{scamLabel(c.scamType)}</Chip>
                    </td>
                    <td className="tabular px-2 py-2.5 text-right font-medium">{c.transaction?.amount ? compactInr(c.transaction.amount) : '-'}</td>
                    <td className="px-2 py-2.5">
                      <StageBar stage={c.stage} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-ink-3">{ago(c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      {selected ? (
        <CaseDrawer id={selected} onClose={() => router.replace('/cases', { scroll: false })} />
      ) : (
        <Panel className="hidden 2xl:flex">
          <Empty>Select a case to see the evidence, the timeline and the messages sent to the family.</Empty>
        </Panel>
      )}
    </div>
  );
}

export default function CasesPage() {
  return (
    <Shell title="Case queue" subtitle="Complaints filed through Satark, newest and most urgent first">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <CaseQueue />
      </Suspense>
    </Shell>
  );
}
