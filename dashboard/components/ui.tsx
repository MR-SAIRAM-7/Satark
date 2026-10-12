'use client';

import clsx from 'clsx';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Loader2, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import type { Severity } from '@/lib/types';

export function Panel({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx('flex min-w-0 flex-col rounded-xl border border-line bg-panel', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-wide text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx('min-h-0 grow', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  );
}

const SEVERITY: Record<Severity | 'good', { icon: LucideIcon; label: string; className: string }> = {
  critical: { icon: AlertOctagon, label: 'Critical', className: 'text-critical bg-critical/12 border-critical/40' },
  warning: { icon: AlertTriangle, label: 'Warning', className: 'text-warning bg-warning/10 border-warning/35' },
  info: { icon: Info, label: 'Info', className: 'text-ink-2 bg-raised border-line' },
  good: { icon: CheckCircle2, label: 'OK', className: 'text-good bg-good/10 border-good/35' },
};

/** Status colour never travels alone: icon + label, always. */
export function SeverityBadge({ severity, label, className }: { severity: Severity | 'good'; label?: string; className?: string }) {
  const s = SEVERITY[severity];
  const Icon = s.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', s.className, className)}>
      <Icon aria-hidden className="size-3.5" />
      {label ?? s.label}
    </span>
  );
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-0.5 text-xs text-ink-2', className)}>
      {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  context,
  tone = 'default',
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  context?: ReactNode;
  tone?: 'default' | 'critical' | 'good';
  icon?: LucideIcon;
}) {
  return (
    <div
      className={clsx(
        'flex min-w-0 flex-col justify-between gap-2 rounded-xl border px-4 py-3',
        tone === 'critical' ? 'border-critical/50 bg-critical/10' : 'border-line bg-panel',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
        {Icon && <Icon aria-hidden className={clsx('size-4', tone === 'critical' ? 'text-critical' : tone === 'good' ? 'text-good' : 'text-ink-3')} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="tabular truncate text-2xl font-semibold leading-none text-ink">{value}</div>
      {context && <div className="truncate text-xs text-ink-3">{context}</div>}
    </div>
  );
}

export function Button({
  variant = 'secondary',
  busy,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent-strong text-white hover:bg-accent',
        variant === 'secondary' && 'border border-line bg-raised text-ink hover:border-ink-3',
        variant === 'danger' && 'bg-critical text-white hover:bg-critical/85',
        variant === 'ghost' && 'text-ink-2 hover:bg-raised hover:text-ink',
        className,
      )}
    >
      {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-24 items-center justify-center px-4 text-center text-sm text-ink-3">{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-raised', className)} />;
}

export const inputClass =
  'w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none';
