'use client';

import clsx from 'clsx';
import { Check, ChevronDown, FileText, Hash, Mail, MessageCircle, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { api } from '@/lib/api';
import { dayTime, FIR_STAGES, formatInr, scamLabel, seriesColor, STAGE_LABEL, stageIndex } from '@/lib/format';
import type { Case, OutboxMessage } from '@/lib/types';

import { Button, Chip, inputClass, Panel, SeverityBadge, Skeleton } from './ui';

const CHANNEL_ICON = { whatsapp: MessageCircle, push: Smartphone, email: Mail, voice: Smartphone };
const FIELD: Partial<Record<Case['stage'], { key: 'ack_number' | 'fir_number' | 'assigned_to'; label: string; placeholder: string }>> = {
  acknowledged: { key: 'ack_number', label: 'Acknowledgement number', placeholder: '31605012345' },
  zero_fir: { key: 'fir_number', label: 'FIR number', placeholder: '142/2026' },
  io_assigned: { key: 'assigned_to', label: 'Investigating officer', placeholder: 'SI Fatima Begum' },
};

export function CaseDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, mutate } = useSWR<{ complaint: Case; messages: OutboxMessage[] }>(`/cases/${id}`);
  const [stage, setStage] = useState<Case['stage'] | ''>('');
  const [extra, setExtra] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  if (!data) return <Skeleton className="h-[600px]" />;
  const c = data.complaint;
  const reached = new Set(c.timeline.map((t) => t.stage));
  const next = FIR_STAGES.find((s) => !reached.has(s));
  const target = stage || next;
  const field = target ? FIELD[target] : undefined;
  const t = c.transaction;

  async function update() {
    if (!target) return;
    setBusy(true);
    try {
      await api(`/cases/${c.id}`, { method: 'PATCH', json: { stage: target, note: note || undefined, ...(field && extra ? { [field.key]: extra } : {}) } });
      toast.success(`${c.ref}: ${STAGE_LABEL[target]}`, { description: 'WhatsApp update sent to the victim and the family.' });
      setStage('');
      setExtra('');
      setNote('');
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openKit() {
    try {
      const kit = await api<{ url: string }>(`/complaints/${c.id}/kit`);
      window.open(kit.url, '_blank', 'noopener');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <span className="font-mono">{c.ref}</span>
          {c.priority === 'golden_hour' && <SeverityBadge severity="critical" label="Golden hour" />}
        </span>
      }
      subtitle={`Filed ${dayTime(c.createdAt)} · ${c.source === 'golden_hour' ? 'opened automatically after a debit' : 'filed from the Satark app'}`}
      action={
        <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-raised hover:text-ink" aria-label="Close case">
          <X className="size-4" />
        </button>
      }
      bodyClassName="space-y-5 p-4"
      className="2xl:sticky 2xl:top-4 2xl:max-h-[calc(100dvh-7rem)] 2xl:overflow-y-auto"
    >
      <p className="rounded-lg border-l-4 border-critical bg-critical/8 px-3 py-2 text-sm text-ink">{c.summary}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Victim</dt>
          <dd>
            {c.elder?.name || 'Anonymous'} <span className="text-xs text-ink-3">{c.elder?.phoneMasked}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Family</dt>
          <dd>
            {c.guardian?.name ? `${c.guardian.name} (${c.guardian.relation ?? 'family'})` : '-'} <span className="text-xs text-ink-3">{c.guardian?.phoneMasked}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Scam</dt>
          <dd>
            <Chip color={seriesColor(c.scamType)}>{scamLabel(c.scamType)}</Chip>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Locality</dt>
          <dd>{c.locality}</dd>
        </div>
        {t?.amount ? (
          <>
            <div>
              <dt className="text-xs text-ink-3">Amount lost</dt>
              <dd className="tabular text-lg font-semibold">{formatInr(t.amount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Bank · UTR</dt>
              <dd className="font-mono text-xs">
                {t.bank ?? '-'} · {t.reference ?? '-'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-ink-3">Beneficiary</dt>
              <dd className="font-mono text-xs">{t.payee ?? t.payeeVpa ?? '-'}</dd>
            </div>
          </>
        ) : (
          <div className="col-span-2 text-xs text-ink-3">No money lost: reporting the attempt and the identifiers.</div>
        )}
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Suspect identifiers</h3>
        <div className="flex flex-wrap gap-1.5">
          {[...c.suspect.phones, ...c.suspect.upiIds, ...c.suspect.links].map((v) => (
            <Chip key={v} className="font-mono">
              {v}
            </Chip>
          ))}
          {c.suspect.phones.length + c.suspect.upiIds.length + c.suspect.links.length === 0 && <span className="text-xs text-ink-3">None captured</span>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">FIR tracker</h3>
        <ol className="space-y-0">
          {FIR_STAGES.map((s, i) => {
            const event = c.timeline.find((e) => e.stage === s);
            return (
              <li key={s} className="relative flex gap-3 pb-3 last:pb-0">
                {i < FIR_STAGES.length - 1 && <span aria-hidden className={clsx('absolute left-[9px] top-5 h-full w-0.5', event ? 'bg-accent/60' : 'bg-line')} />}
                <span className={clsx('relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2', event ? 'border-accent bg-accent' : 'border-line bg-panel')}>
                  {event && <Check aria-hidden className="size-3 text-white" />}
                </span>
                <div className="min-w-0 text-sm">
                  <div className={event ? 'text-ink' : 'text-ink-3'}>{STAGE_LABEL[s]}</div>
                  {event && (
                    <div className="text-xs text-ink-3">
                      {dayTime(event.at)}
                      {event.by ? ` · ${event.by}` : ''}
                      {event.note ? ` · ${event.note}` : ''}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {next && (
        <div className="space-y-2 rounded-lg border border-line bg-page/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ink-2" htmlFor="stage">
              Move to
            </label>
            <select
              id="stage"
              className={`${inputClass} w-auto py-1.5`}
              value={target}
              onChange={(e) => {
                setStage(e.target.value as Case['stage']);
                setExtra('');
              }}
            >
              {FIR_STAGES.filter((s) => stageIndex(s) > 0 && !reached.has(s)).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          {field && <input className={inputClass} placeholder={`${field.label} (${field.placeholder})`} value={extra} onChange={(e) => setExtra(e.target.value)} />}
          <input className={inputClass} placeholder="Note for the record (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="primary" busy={busy} onClick={update} className="w-full">
            Update and notify the family
          </Button>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Evidence ({c.evidence.length})</h3>
          <Button onClick={openKit}>
            <FileText aria-hidden className="size-4" /> Complaint Kit PDF
          </Button>
        </div>
        <ul className="space-y-1.5">
          {c.evidence.map((e) => (
            <li key={e.sha256} className="rounded-lg bg-page/50 px-3 py-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-ink">{e.label}</span>
                <span className="shrink-0 text-ink-3">{dayTime(e.at)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-ink-3" title={e.sha256}>
                <Hash aria-hidden className="size-3" /> SHA-256 {e.sha256.slice(0, 24)}…
              </div>
            </li>
          ))}
        </ul>
        {c.narrative && (
          <div className="mt-2">
            <button onClick={() => setShowNarrative((v) => !v)} className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
              <ChevronDown aria-hidden className={clsx('size-3.5 transition-transform', showNarrative && 'rotate-180')} /> Complaint text (cybercrime.gov.in sections)
            </button>
            {showNarrative && <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-page/60 p-3 text-xs text-ink-2">{c.narrative}</pre>}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Automated messages ({data.messages.length})</h3>
        <ul className="space-y-1.5">
          {data.messages
            .slice()
            .reverse()
            .map((m) => {
              const Icon = CHANNEL_ICON[m.channel] ?? MessageCircle;
              return (
                <li key={m.id} className="rounded-lg bg-page/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-ink-3">
                    <Icon aria-hidden className="size-3.5" />
                    <span className="capitalize text-ink-2">{m.audience}</span>
                    <span className="font-mono">{m.toMasked}</span>
                    <span className="ml-auto">{dayTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-ink-2">{m.body}</p>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">{m.status === 'demo' ? 'Demo · recorded, not sent' : m.status}</div>
                </li>
              );
            })}
        </ul>
      </div>
    </Panel>
  );
}
