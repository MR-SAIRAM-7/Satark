/**
 * Socket.IO: the police dashboard joins the `police` room; every app user
 * joins `user:<id>` for alerts and the live-call "CUT" signal.
 */
import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { corsOrigin } from '../config/env';
import { FeedEvent, type FeedEventDoc } from '../db/models';
import { logger } from '../lib/logger';
import { locate } from '../lib/geo';
import { verifyToken } from '../middleware/auth';

let io: Server | null = null;

export function attachRealtime(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: corsOrigin }, serveClient: false });
  io.on('connection', (socket) => {
    const user = verifyToken(socket.handshake.auth?.token as string | undefined);
    if (!user) return;
    socket.join(`user:${user.id}`);
    if (user.role === 'police') socket.join('police');
    logger.debug({ role: user.role }, 'socket connected');
  });
  return io;
}

export const closeRealtime = async () => {
  await io?.close();
  io = null;
};

export const emitToUser = (userId: string | { toString(): string }, event: string, payload: unknown) =>
  io?.to(`user:${userId.toString()}`).emit(event, payload);

export const emitToPolice = (event: string, payload: unknown) => io?.to('police').emit(event, payload);

export interface FeedInput {
  type: FeedEventDoc['type'];
  severity?: FeedEventDoc['severity'];
  title: string;
  detail?: string;
  scamType?: string;
  locality?: string | null;
  ref?: string;
}

/** Record a dashboard feed event and push it live. Critical events sound the dashboard alarm. */
export async function publish(input: FeedInput): Promise<void> {
  const place = locate(input.locality);
  const doc = await FeedEvent.create({
    ...input,
    locality: input.locality ? place.locality : undefined,
    geo: input.locality ? { lat: place.lat, lng: place.lng } : undefined,
  });
  emitToPolice('feed', doc.toJSON());
}
