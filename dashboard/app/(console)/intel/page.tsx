'use client';

import clsx from 'clsx';
import { Download, Globe, Plus, Search, ShieldBan } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { CampaignList, IndicatorList } from '@/components/panels';
import { Shell } from '@/components/Shell';
import { Button, Chip, Empty, inputClass, Panel, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { ago, IOC_LABEL, scamLabel } from '@/lib/format';
import type { Campaign, Indicator } from '@/lib/types';

const TYPES = ['', 'phone', 'upi', 'domain'] as const;
const BRANDS = ['sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb'];
const SCAM_OPTIONS = ['digital_arrest', 'kyc_bank', 'investment', 'electricity', 'courier', 'lottery', 'job_task', 'upi_collect', 'malware_apk', 'remote_access', 'family_emergency', 'sim_block', 'phishing_link'];

interface Hunt {
  brand: string;
  source: 'crt.sh' | 'sample';
  note?: string;
  results: { domain: string; imitates: string | null; risk: string[]; firstSeen: string | null; issuer: string | null }[];
}

function Lookup() {
  const [type, setType] = useState<'phone' | 'upi' | 'domain'>('phone');
  const [value, setValue] = useState('+91 90000 54321');
  const [result, setResult] = useState<{ found: boolean; ioc: Indicator | null } | null>(null);
  const [scamType, setScamType] = useState('digital_arrest');
  const [busy, setBusy] = useState(false);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setResult(await api(`/iocs/lookup?type=${type}&value=${encodeURIComponent(value)}`));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    try {
      await api('/iocs', { method: 'POST', json: { type, value, scam_type: scamType } });
      toast.success('Added to the community blocklist', { description: 'Every Satark phone blocks it at the next sync.' });
      setResult(await api(`/iocs/lookup?type=${type}&value=${encodeURIComponent(value)}`));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Panel title="Check an identifier" subtitle="Hashed the same way the phones hash it: the raw value is never stored">
      <form onSubmit={lookup} className="flex flex-wrap gap-2">
        <select className={`${inputClass} w-auto`} value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Identifier type">
          <option value="phone">Phone</option>
          <option value="upi">UPI ID</option>
          <option value="domain">Domain</option>
        </select>
        <input className={`${inputClass} min-w-48 flex-1`} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Value" />
        <Button type="submit" busy={busy}>
          <Search aria-hidden className="size-4" /> Look up
        </Button>
      </form>
      {result && (
        <div className="mt-3 rounded-lg bg-page/50 p-3 text-sm">
          {result.found && result.ioc ? (
            <div className="flex flex-wrap items-center gap-2">
              <ShieldBan aria-hidden className="size-4 text-critical" />
              <span className="font-mono">{result.ioc.masked}</span>
              <span className="text-ink-2">
                {result.ioc.reportCount} reports · {result.ioc.status === 'confirmed' ? 'blocked' : 'suspected'} · {scamLabel(result.ioc.scamType)} · last seen {ago(result.ioc.lastSeen)}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink-2">Not in the community intel.</span>
              <select className={`${inputClass} w-auto py-1`} value={scamType} onChange={(e) => setScamType(e.target.value)} aria-label="Scam type">
                {SCAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {scamLabel(s)}
                  </option>
                ))}
              </select>
              <Button onClick={add}>
                <Plus aria-hidden className="size-4" /> Add as confirmed
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function DomainHunter() {
  const [brand, setBrand] = useState('sbi');
  const { data, isLoading } = useSWR<Hunt>(`/domains/hunt?brand=${brand}`);
  return (
    <Panel
      title="Phishing domain hunter"
      subtitle="New TLS certificates (Certificate Transparency, crt.sh) for look-alike bank domains. Passive only."
      action={
        <select className={`${inputClass} w-auto py-1`} value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
          {BRANDS.map((b) => (
            <option key={b} value={b}>
              {b.toUpperCase()}
            </option>
          ))}
        </select>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          {data.note && <p className="mb-2 rounded-lg bg-raised px-3 py-2 text-xs text-ink-2">{data.note}</p>}
          {data.results.length === 0 ? (
            <Empty>No suspicious certificates found.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.results.slice(0, 12).map((d) => (
                <li key={d.domain} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Globe aria-hidden className="size-4 text-ink-3" />
                  <span className="font-mono">{d.domain}</span>
                  {d.imitates && <span className="text-xs text-ink-3">imitates {d.imitates}</span>}
                  <span className="ml-auto flex flex-wrap gap-1">
                    {d.risk.map((r) => (
                      <Chip key={r}>{r}</Chip>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-ink-3">Source: {data.source === 'crt.sh' ? 'crt.sh live' : 'generated examples (crt.sh unreachable)'}</p>
        </>
      )}
    </Panel>
  );
}

export default function IntelPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>('');
  const { data: indicators } = useSWR<{ indicators: Indicator[] }>(`/dashboard/indicators?limit=40${type ? `&type=${type}` : ''}`);
  const { data: campaigns } = useSWR<{ campaigns: Campaign[] }>('/dashboard/campaigns');
  const [exporting, setExporting] = useState(false);

  async function exportStix() {
    setExporting(true);
    try {
      const bundle = await api<{ objects: unknown[] }>('/stix/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `satark-stix-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`STIX 2.1 bundle exported`, { description: `${bundle.objects.length} objects for CERT-In and other cyber cells` });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Shell title="Threat intelligence" subtitle="Community-reported numbers, UPI IDs and domains: herd immunity for scams">
      <div className="grid gap-4 xl:grid-cols-2">
        <Lookup />
        <Panel title="Share with other agencies" subtitle="Confirmed indicators and active campaigns as a STIX 2.1 bundle">
          <p className="mb-3 text-sm text-ink-2">
            Domains export as standard <span className="font-mono text-xs">domain-name</span> patterns. Phone numbers and UPI IDs export as the
            SHA-256 hashes the phones match on, never in clear.
          </p>
          <Button variant="primary" busy={exporting} onClick={exportStix}>
            <Download aria-hidden className="size-4" /> Export STIX 2.1 bundle
          </Button>
        </Panel>

        <Panel
          title="Indicators"
          subtitle="Sorted by independent reports"
          action={
            <div className="flex shrink-0 whitespace-nowrap rounded-lg bg-raised p-0.5 text-xs" role="group" aria-label="Indicator type">
              {TYPES.map((t) => (
                <button key={t || 'all'} onClick={() => setType(t)} aria-pressed={type === t} className={clsx('rounded-md px-2.5 py-1', type === t ? 'bg-panel text-ink' : 'text-ink-3')}>
                  {t ? IOC_LABEL[t] : 'All'}
                </button>
              ))}
            </div>
          }
          bodyClassName="max-h-[560px] overflow-y-auto p-4"
        >
          <IndicatorList indicators={indicators?.indicators} />
        </Panel>
        <div className="space-y-4">
          <DomainHunter />
          <Panel title="Active campaigns">
            <CampaignList campaigns={campaigns?.campaigns} />
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
