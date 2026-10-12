/** Entry point: database, seed (first run), HTTP + Socket.IO, scheduled automation. */
import { createServer } from 'node:http';

import { env, features } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db/connect';
import { User } from './db/models';
import { startJobs, stopJobs } from './jobs';
import { logger } from './lib/logger';
import { seed } from './seed';
import { closePdf } from './services/pdf';
import { attachRealtime, closeRealtime } from './services/realtime';

const { embedded } = await connectDb();
if (env.SEED_ON_START && (await User.countDocuments()) === 0) {
  logger.info('empty database: seeding demo data');
  await seed();
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
