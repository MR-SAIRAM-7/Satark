'use client';

import { KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, inputClass } from '@/components/ui';
import { api, session, type Officer } from '@/lib/api';

/** Phone + one-time code. Police accounts are created by an administrator, never by sign-up. */
export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91 90000 00001');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 'phone') {
        const res = await api<{ hint?: string }>('/auth/otp/start', { method: 'POST', json: { phone } });
        setHint(res.hint ?? 'A code was sent by SMS.');
        setStep('code');
      } else {
        const res = await api<{ token: string; user: Officer }>('/auth/otp/verify', { method: 'POST', json: { phone, code } });
        if (res.user.role !== 'police') throw new Error('This number is not registered to a police officer.');
        session.save(res.token, res.user);
        router.replace('/');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-accent-strong">
            <ShieldCheck aria-hidden className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Satark Cyber Cell</h1>
            <p className="text-sm text-ink-3">Hyderabad · police access only</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-2">Registered mobile number</span>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={step === 'code'} inputMode="tel" autoComplete="tel" />
          </label>
          {step === 'code' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink-2">One-time code</span>
              <input
                className={`${inputClass} tabular tracking-[0.4em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="••••••"
              />
            </label>
          )}
          {hint && step === 'code' && <p className="rounded-lg bg-raised px-3 py-2 text-xs text-ink-2">{hint}</p>}
          {error && (
            <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-ink">
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" busy={busy} className="w-full py-2">
            <KeyRound aria-hidden className="size-4" />
            {step === 'phone' ? 'Send code' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-ink-3">Demo mode: Inspector K. Rao, +91 90000 00001, code 123456</p>
      </div>
    </main>
  );
}
