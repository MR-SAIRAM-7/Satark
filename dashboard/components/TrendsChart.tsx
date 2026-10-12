'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';

import { OTHER_COLOR, scamLabel, SERIES, seriesKey } from '@/lib/format';

interface Props {
  types: string[];
  points: ({ at: number } & Record<string, number>)[];
}

const KEYS = [...SERIES.map((s) => s.type as string), 'other'];
const colorOf = (key: string) => SERIES.find((s) => s.type === key)?.color ?? OTHER_COLOR;
const labelOf = (key: string) => (key === 'other' ? 'Other' : scamLabel(key));
const tick = (at: number) => new Date(at).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit' });

function TrendTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].filter((p) => Number(p.value) > 0).reverse();
  const total = rows.reduce((s, p) => s + Number(p.value), 0);
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-ink">{new Date(Number(label)).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: colorOf(String(p.dataKey)) }} />
          <span className="text-ink-2">{labelOf(String(p.dataKey))}</span>
          <span className="tabular ml-auto pl-4 text-ink">{p.value}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-line pt-1 text-ink-2">
        <span>Total</span>
        <span className="tabular text-ink">{total}</span>
      </div>
    </div>
  );
}

/** Reports over time, stacked by scam type in fixed slot order; small types fold into Other. */
export function TrendsChart({ points }: Props) {
  const rows = points.map(({ at, ...counts }) => {
    const row: Record<string, number> = { at };
    for (const [type, n] of Object.entries(counts)) row[seriesKey(type)] = (row[seriesKey(type)] ?? 0) + n;
    return row;
  });
  const present = KEYS.filter((k) => rows.some((r) => (r[k] ?? 0) > 0));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2">
        {present.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: colorOf(k) }} /> {labelOf(k)}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barCategoryGap="18%" margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="#2f2f2c" />
            <XAxis dataKey="at" tickFormatter={tick} tick={{ fill: '#8f8e86', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: '#8f8e86', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={(props) => <TrendTooltip {...(props as TooltipContentProps<number, string>)} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            {present.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="reports" fill={colorOf(k)} stroke="#1a1a19" strokeWidth={2} radius={i === present.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
