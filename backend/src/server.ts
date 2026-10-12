/** Entry point: database, seed (first run), HTTP + Socket.IO, scheduled automation. */
import { createServer } from 'node:http';

import { env, features } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db/connect';
import { User } from './db/models';
import { startJobs, stopJobs } from './jobs';
import { logger } from './lib/logger';
import { explainStartupError } from './lib/startup';
import { seed } from './seed';
import { closePdf } from './services/pdf';
import { attachRealtime, closeRealtime } from './services/realtime';

// A stray rejected promise in a background job must not take the API down mid-demo: log it and carry on.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

let embedded = false;
try {
  ({ embedded } = await connectDb());
  if (env.SEED_ON_START && (await User.countDocuments()) === 0) {
    logger.info('empty database: seeding demo data');
    await seed();
  }
} catch (err) {
  // Say what to fix in plain words; a deploy should never fail silently.
  console.error(`\nSatark API could not start.\n${explainStartupError(err)}\n`);
  process.exit(1);
}

const server = createServer(createApp());
attachRealtime(server);
startJobs();

server.listen(env.PORT, () => {
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
  await stopJobs();
  await closeRealtime();
  server.close();
  await closePdf();
  await disconnectDb();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
