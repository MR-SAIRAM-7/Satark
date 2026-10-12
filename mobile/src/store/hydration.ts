import { useEffect, useState } from 'react';

import { useAlerts, useDrills, useIntel } from './activity';
import { useChecks } from './checks';
import { useComplaints } from './complaints';
import { useSettings } from './settings';

const stores = [useSettings, useChecks, useAlerts, useIntel, useDrills, useComplaints];

/** Resolves once every persisted store has loaded from disk. */
export function whenHydrated(): Promise<void> {
  return Promise.all(
    stores.map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) resolve();
          else store.persist.onFinishHydration(() => resolve());
        }),
    ),
  ).then(() => undefined);
}

export function useHydrated(): boolean {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (!ready) whenHydrated().then(() => setReady(true));
  }, [ready]);
  return ready;
}
