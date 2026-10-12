import { io, type Socket } from 'socket.io-client';

import { env, hasBackend } from '@/config/env';
import { refreshCase } from '@/features/complaint/tracker';
import { receiveAlert } from '@/features/family/sync';
import { onCallCut } from '@/features/calls/guard';
import { api, type ServerAlert } from '@/services/api';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';

/**
 * Live connection to the backend (Socket.IO): family alerts for guardian
 * phones, the Home Guardian's "CUT" signal for the elder's phone, and case
 * updates from the cyber cell. The token is fetched on every (re)connect, so a
 * role switch or a new session is picked up by reconnecting.
 */
let socket: Socket | null = null;
let role = useSettings.getState().role;

export function connectRealtime(): void {
  if (!hasBackend || socket) return;
  socket = io(env.apiBaseUrl.replace(/\/v1$/, ''), {
    transports: ['websocket'],
    auth: (cb) => {
      api.sessionToken().then((token) => cb({ token }), () => cb({}));
    },
  });
  socket.on('alert', (alert: ServerAlert) => receiveAlert(alert));
  socket.on('cut', (signal: { sessionId?: string; caller?: string | null }) => onCallCut(signal));
  socket.on('case:update', (update: { ref?: string; stage?: string }) => {
    const local = useComplaints.getState().complaints.find((c) => c.caseRef && c.caseRef === update.ref);
    if (local) void refreshCase(local.id);
  });
  socket.on('connect', () => {
    // Anything that changed while disconnected.
    useComplaints
      .getState()
      .complaints.filter((c) => c.caseRef)
      .slice(0, 5)
      .forEach((c) => void refreshCase(c.id));
  });
}

/** Reconnect as the new identity when the phone switches role. */
useSettings.subscribe((s) => {
  if (s.role === role) return;
  role = s.role;
  if (socket) {
    socket.disconnect();
    socket.connect();
  }
});
