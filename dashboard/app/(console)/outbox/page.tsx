'use client';

import clsx from 'clsx';
import { Mail, MessageCircle, Smartphone } from 'lucide-react';
import useSWR from 'swr';

import { Shell } from '@/components/Shell';
import { Empty, Panel, SeverityBadge, Skeleton } from '@/components/ui';
import { dayTime } from '@/lib/format';
import type { OutboxMessage } from '@/lib/types';

const CHANNEL = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  push: { icon: Smartphone, label: 'Push' },
  email: { icon: Mail, label: 'Letter' },
  voice: { icon: Smartphone, label: 'Voice' },
};

const PURPOSE: Record<string, string> = {
  kit_ready: 'Complaint Kit ready',
  helpline_1930: '1930 update',
  portal_filed: 'Portal update',
  acknowledged: 'Acknowledgement',
  bank_hold: 'Bank hold',
  zero_fir: 'FIR registered',
  io_assigned: 'IO assigned',
  golden_hour_reminder: 'Golden-hour reminder',
  follow_up: 'Follow-up',
  scam_message: 'Scam alert',
  scam_call: 'Scam call alert',
  golden_hour: 'Money-lost alert',
  app_update: 'App update',
};

function Status({ status }: { status: OutboxMessage['status'] }) {
  if (status === 'sent') return <SeverityBadge severity="good" label="Sent" />;
  if (status === 'delivered') return <SeverityBadge severity="good" label="Delivered" />;
  if (status === 'read') return <SeverityBadge severity="good" label="Read" />;
  if (status === 'failed') return <SeverityBadge severity="critical" label="Failed" />;
  if (status === 'skipped') return <SeverityBadge severity="info" label="No number" />;
  return <SeverityBadge severity="info" label="Demo" />;
}

/** Everything Satark told victims, families and banks, by itself. */
export default function OutboxPage() {
  const { data } = useSWR<{ messages: OutboxMessage[] }>('/dashboard/outbox?limit=150', { refreshInterval: 20_000 });

  return (
    <Shell title="Automated messages" subtitle="WhatsApp, push and letters sent by Satark's automations. Demo mode records them instead of sending.">
      <Panel bodyClassName="overflow-x-auto">
        {!data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.messages.length === 0 ? (
          <Empty>No messages yet.</Empty>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-2 py-2 font-medium">Channel</th>
                <th className="px-2 py-2 font-medium">To</th>
                <th className="px-2 py-2 font-medium">Why</th>
                <th className="px-2 py-2 font-medium">Message</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.messages.map((m) => {
                const channel = CHANNEL[m.channel] ?? CHANNEL.push;
                const Icon = channel.icon;
                return (
                  <tr key={m.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-3">{dayTime(m.createdAt)}</td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                        <Icon aria-hidden className="size-3.5" /> {channel.label}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs">
                      <div className="capitalize text-ink-2">{m.audience}</div>
                      <div className="font-mono text-ink-3">{m.toMasked}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs text-ink-2">{PURPOSE[m.purpose ?? ''] ?? m.purpose}</td>
                    <td className={clsx('px-2 py-2.5 text-xs text-ink-2', m.channel === 'email' && 'whitespace-pre-line')}>
                      {m.body}
                      {/* Why it failed (or went without its PDF), so the fix is obvious during a demo. */}
                      {m.error ? <div className="mt-1 text-ink-3">{m.error}</div> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Status status={m.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </Shell>
  );
}
