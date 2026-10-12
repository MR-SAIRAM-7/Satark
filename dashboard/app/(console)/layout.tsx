'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { SWRConfig } from 'swr';

import { fetcher, session } from '@/lib/api';
import { RealtimeProvider } from '@/lib/realtime';

/** Every console page needs a police session; the live connection is shared across pages. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.token()) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) return null;
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, keepPreviousData: true }}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </SWRConfig>
  );
}
