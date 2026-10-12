import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { MongoMemoryServer } from 'mongodb-memory-server';
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

/** Atlas's copied connection string often has no database name; without one, data would land in "test". */
const hasDatabaseName = (uri: string) => /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?/]+/.test(uri);

/**
 * MONGODB_URI (Atlas) when set. Otherwise an embedded MongoDB, so `npm run dev`
 * needs no setup: it persists to backend/.data/mongo unless `ephemeral` (tests).
 */
export async function connectDb({ ephemeral = false } = {}): Promise<{ embedded: boolean }> {
  let uri = env.MONGODB_URI;
  if (!uri) {
    // Loaded only when needed: a hosted deploy never starts (or downloads) a local mongod.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = ephemeral ? undefined : resolve(process.cwd(), '.data', 'mongo');
    if (dbPath) mkdirSync(dbPath, { recursive: true });
    // Windows can take a while to start mongod: allow a minute rather than the default ten seconds.
    embedded = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000, ...(dbPath ? { dbPath, storageEngine: 'wiredTiger' as const } : {}) } });
    uri = embedded.getUri('satark');
    if (!ephemeral) logger.info({ dbPath }, 'MONGODB_URI not set: using embedded MongoDB');
  }
  // Fail in 15 seconds, not 30, when the cluster is unreachable: a deploy should say so quickly.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000, ...(hasDatabaseName(uri) ? {} : { dbName: 'satark' }) });
  if (!ephemeral) logger.info({ database: mongoose.connection.name }, 'connected to MongoDB');
  await mongoose.connection.syncIndexes();
  return { embedded: Boolean(embedded) };
}

// After start-up the driver reconnects by itself; say so in the log, so a blip is not a mystery.
let connected = false;
let closing = false;
mongoose.connection.on('connected', () => (connected = true));
mongoose.connection.on('disconnected', () => connected && !closing && logger.warn('MongoDB connection lost; retrying'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB connection restored'));

export async function disconnectDb(): Promise<void> {
  closing = true;
  await mongoose.disconnect();
  closing = false;
  await embedded?.stop();
  embedded = null;
}

export const dbReady = () => mongoose.connection.readyState === 1;
