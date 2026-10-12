'use client';

import { ChevronDown, Clapperboard, PhoneOff, Radio, RotateCcw, Siren, Timer, Waves } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { api, fetcher } from '@/lib/api';

const SCENARIOS = [
  { name: 'golden_hour', label: 'Golden hour', detail: 'Scam chat, then ₹1.25 L debited: case opens itself', icon: Timer },
  { name: 'scam_wave', label: 'Scam wave', detail: 'One UPI ID reported across 5 localities', icon: Waves },
  { name: 'call_cut', label: 'Live call cut', detail: 'Home Guardian hears a digital-arrest call', icon: PhoneOff },
  { name: 'escalation', label: 'Unanswered alert', detail: 'Family did not respond: escalate', icon: Siren },
] as const;

/** The presenter's control room: storylines, live traffic, reset. Nothing here reaches a real service. */
export function DemoMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useSWR<{ liveFeed: boolean }>('/demo/status', fetcher);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      await action();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-ink"
        aria-expanded={open}
      >
        <Clapperboard aria-hidden className="size-3.5 text-accent" /> Demo
        <ChevronDown aria-hidden className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-[1000] mt-2 w-80 rounded-xl border border-line bg-raised p-2 shadow-2xl">
          <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Run a storyline</div>
          {SCENARIOS.map(({ name, label, detail, icon: Icon }) => (
            <button
              key={name}
              disabled={busy !== null}
              onClick={() =>
                run(name, async () => {
                  await api('/demo/scenario', { method: 'POST', json: { name } });
                  toast.success(`${label} started`, { description: 'Watch the feed, the map and the case queue.' });
                  setOpen(false);
                })
              }
              className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-panel disabled:opacity-50"
            >
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                <span className="block text-sm text-ink">{label}</span>
                <span className="block text-xs text-ink-3">{detail}</span>
              </span>
            </button>
          ))}
          <div className="my-2 border-t border-line" />
          <button
            disabled={busy !== null}
            onClick={() =>
              run('feed', async () => {
                const res = await api<{ liveFeed: boolean }>('/demo/feed', { method: 'POST', json: { on: !data?.liveFeed } });
                await mutate(res, { revalidate: false });
                toast(res.liveFeed ? 'Live traffic on: a scam event every 10-25 s' : 'Live traffic off');
              })
            }
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-panel"
          >
            <Radio aria-hidden className={data?.liveFeed ? 'size-4 text-good' : 'size-4 text-ink-3'} />
            <span className="flex-1">Live traffic simulator</span>
            <span className={data?.liveFeed ? 'text-xs font-semibold text-good' : 'text-xs text-ink-3'}>{data?.liveFeed ? 'ON' : 'OFF'}</span>
          </button>
          <button
            disabled={busy !== null}
            onClick={() =>
              run('reset', async () => {
                if (!window.confirm('Reset all demo data? Cases, reports and alerts go back to the seeded state.')) return;
                await api('/demo/reset', { method: 'POST' });
                toast.success('Demo data reset');
                window.location.reload();
              })
            }
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-ink-2 hover:bg-panel"
          >
            <RotateCcw aria-hidden className="size-4" /> Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}
