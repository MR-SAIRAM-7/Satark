import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { env } from '../config/env';
import { logger } from '../lib/logger';

let embedded: MongoMemoryServer | null = null;

// API responses use `id`, never Mongo internals.
mongoose.set('strictQuery', true);
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

/**
 * MONGODB_URI (Atlas) when set. Otherwise an embedded MongoDB, so `npm run dev`
 * needs no setup: it persists to backend/.data/mongo unless `ephemeral` (tests).
 */
export async function connectDb({ ephemeral = false } = {}): Promise<{ embedded: boolean }> {
  let uri = env.MONGODB_URI;
  if (!uri) {
    const dbPath = ephemeral ? undefined : resolve(process.cwd(), '.data', 'mongo');
    if (dbPath) mkdirSync(dbPath, { recursive: true });
    // Windows can take a while to start mongod: allow a minute rather than the default ten seconds.
    embedded = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000, ...(dbPath ? { dbPath, storageEngine: 'wiredTiger' as const } : {}) } });
    uri = embedded.getUri('satark');
    if (!ephemeral) logger.info({ dbPath }, 'MONGODB_URI not set: using embedded MongoDB');
  }
  await mongoose.connect(uri);
  await mongoose.connection.syncIndexes();
  return { embedded: Boolean(embedded) };
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  await embedded?.stop();
  embedded = null;
}

export const dbReady = () => mongoose.connection.readyState === 1;
