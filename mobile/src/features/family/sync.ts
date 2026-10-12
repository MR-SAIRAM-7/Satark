import type { ScamType } from '@satark/shared';

import { translate } from '@/i18n';
import { api, type ServerAlert } from '@/services/api';
import { notify } from '@/services/notifications';
import { setServerReadHandler, useAlerts } from '@/store/activity';
import { useSettings } from '@/store/settings';
import type { GuardianAlert } from '@/types';

/**
 * The family side of the backend: alerts raised on the elder's phone reach the
 * guardian's phone (and are acknowledged from it, which stops the server
 * escalating them), and pairing codes come from the server.
 */

setServerReadHandler((serverId) => void api.ackAlert(serverId));

const KIND: Record<string, GuardianAlert['kind']> = {
  scam_message: 'scam_message',
  scam_call: 'scam_call',
  call_blocked: 'call_blocked',
  call_cut: 'call_cut',
  money_debited: 'money_debited',
  golden_hour: 'money_debited',
  complaint_ready: 'complaint_ready',
  escalation: 'scam_call',
};

export function toGuardianAlert(a: ServerAlert): GuardianAlert {
  return {
    id: `srv_${a.id}`,
    serverId: a.id,
    createdAt: Date.parse(a.createdAt) || Date.now(),
    kind: KIND[a.kind] ?? 'scam_message',
    title: a.title ?? '',
    summary: a.summary ?? '',
    score: a.score ?? 0,
    scamType: (a.scamType ?? 'unknown') as ScamType,
    read: Boolean(a.ackedAt),
  };
}

const watchesFamily = () => useSettings.getState().role !== 'elder';

/** A live alert from the server: shown and announced on guardian and Home Guardian phones. */
export function receiveAlert(alert: ServerAlert): void {
  if (!watchesFamily()) return; // the elder's own phone raised it already
  const [fresh] = useAlerts.getState().mergeServer([toGuardianAlert(alert)]);
  if (fresh) notify(translate(useSettings.getState().lang, `alert.${fresh.kind}`), fresh.summary);
}

/** Catch up on alerts raised while this phone was offline or closed. */
export async function syncFamilyAlerts(): Promise<void> {
  if (!watchesFamily()) return;
  const alerts = await api.familyAlerts();
  if (alerts) useAlerts.getState().mergeServer(alerts.map(toGuardianAlert));
}

/** The elder's pairing code comes from the server, which checks it when the guardian types it. */
export async function refreshPairingCode(): Promise<void> {
  if (useSettings.getState().role !== 'elder') return;
  const code = await api.pairingCode();
  if (code) useSettings.getState().update({ pairingCode: code });
}

/** Link this guardian or Home Guardian phone to the elder whose code was typed in. */
export function linkFamily(code: string) {
  return api.linkFamily(code.replace(/\D/g, ''));
}
