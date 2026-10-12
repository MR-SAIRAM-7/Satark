/**
 * Imported first by server.ts, so it runs before any other module (ES modules
 * evaluate in import order). The first log line proves the process started;
 * after it, any crash is printed before the process exits.
 */
import { say } from './lib/startup';

say(`Satark API starting (Node ${process.version}, NODE_ENV=${process.env.NODE_ENV ?? 'development'}, pid ${process.pid})`);

// A stray rejected promise in a background job must not take the API down mid-demo: log it and carry on.
process.on('unhandledRejection', (reason) => say(`Unhandled rejection: ${(reason as Error)?.stack ?? String(reason)}`));
process.on('uncaughtException', (err) => {
  say(`\nSatark API stopped on an uncaught error:\n${err?.stack ?? String(err)}\n`);
  process.exit(1);
});
