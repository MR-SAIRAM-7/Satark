/** Entry point: database, seed (first run), HTTP + Socket.IO, scheduled automation. */
import './boot';

import { createServer } from 'node:http';

import { env, features } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db/connect';
import { User } from './db/models';
import { startJobs, stopJobs } from './jobs';
import { logger } from './lib/logger';
import { explainStartupError, fatal } from './lib/startup';
import { seed } from './seed';
import { closePdf } from './services/pdf';
import { attachRealtime, closeRealtime } from './services/realtime';

let embedded = false;
try {
  ({ embedded } = await connectDb());
  if (env.SEED_ON_START && (await User.countDocuments()) === 0) {
    logger.info('empty database: seeding demo data');
    await seed();
  }
} catch (err) {
  // Say what to fix in plain words; a deploy should never fail silently.
  fatal(explainStartupError(err));
}

const server = createServer(createApp());
attachRealtime(server);

server.on('error', (err: NodeJS.ErrnoException) => {
  fatal(err.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use. Stop the other server or set PORT.` : `${err.name}: ${err.message}`);
});

server.listen(env.PORT, () => {
  startJobs();
  logger.info(
    { url: env.PUBLIC_BASE_URL, mode: env.DEMO_MODE ? 'demo' : 'live', db: embedded ? 'embedded' : 'atlas', integrations: features },
    `Satark API listening on :${env.PORT}`,
  );
});

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  logger.info({ signal }, 'shutting down');
  // Hosts send SIGKILL about 30 seconds after SIGTERM: never hang on a stuck connection.
  setTimeout(() => process.exit(0), 10_000).unref();
  try {
    await stopJobs();
    await closeRealtime();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePdf();
    await disconnectDb();
  } catch (err) {
    logger.warn({ err }, 'error while shutting down');
  }
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
