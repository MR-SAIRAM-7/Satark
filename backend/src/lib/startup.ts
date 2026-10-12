/**
 * Turns a start-up failure into one plain sentence about what to fix. A deploy
 * that dies with a bare stack trace (or nothing at all) costs a rebuild to
 * diagnose; almost every real failure here is the database connection string.
 */
import { writeSync } from 'node:fs';

/**
 * Write straight to stderr. On Linux, process.stderr is asynchronous when it is
 * a pipe (as in a container), so a message followed by process.exit() can be
 * lost; a synchronous write cannot.
 */
export function say(text: string): void {
  try {
    writeSync(2, `${text}\n`);
  } catch {
    console.error(text);
  }
}

/** Print why the API cannot run, then stop with a failure code. */
export function fatal(text: string): never {
  say(`\nSatark API could not start.\n${text}\n`);
  process.exit(1);
}

/** Never echo credentials from a connection string into the logs. */
const redact = (text: string) => text.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, '$1***@');

export function explainStartupError(err: unknown): string {
  const error = err as { name?: string; message?: string; code?: number | string; codeName?: string };
  const name = error?.name ?? 'Error';
  const message = redact(String(error?.message ?? err));
  const text = `${name} ${message} ${error?.codeName ?? ''}`.toLowerCase();
  const detail = `(${name}: ${message})`;

  if (name === 'MongoParseError' || text.includes('invalid scheme') || text.includes('invalid connection string')) {
    return [
      'MONGODB_URI is not a valid connection string.',
      'It must look like: mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/satark',
      'Remove any quotes, spaces and the < > around the password. If the password has special',
      'characters (@ : / ? # %), URL-encode them, e.g. @ becomes %40.',
      detail,
    ].join('\n');
  }
  if (text.includes('bad auth') || text.includes('authentication failed') || error?.code === 8000 || error?.code === 18) {
    return [
      'MongoDB rejected the username or password in MONGODB_URI.',
      'In Atlas > Database Access, check the user exists and reset its password, then update MONGODB_URI.',
      'URL-encode special characters in the password (@ becomes %40).',
      detail,
    ].join('\n');
  }
  if (text.includes('querysrv') || text.includes('enotfound') || text.includes('eai_again')) {
    return [
      'The cluster address in MONGODB_URI could not be found.',
      'Copy the connection string again from Atlas > Connect > Drivers; the host looks like cluster0.xxxxx.mongodb.net.',
      detail,
    ].join('\n');
  }
  if (text.includes('econnrefused') && /127\.0\.0\.1|localhost|::1/.test(text)) {
    return [
      'MONGODB_URI points at a MongoDB on this machine (localhost), and none is running here.',
      'On a hosted service, use the MongoDB Atlas connection string instead (see docs/DEPLOY.md).',
      detail,
    ].join('\n');
  }
  if (name === 'MongooseServerSelectionError' || text.includes('server selection') || text.includes('timed out') || text.includes('whitelist')) {
    return [
      'Could not reach the MongoDB cluster.',
      'In Atlas > Network Access, add 0.0.0.0/0 (allow access from anywhere): hosted services have no fixed address.',
      'Also check the cluster is not paused.',
      detail,
    ].join('\n');
  }
  if (text.includes('not authorized') || error?.code === 13) {
    return [
      'The MongoDB user in MONGODB_URI may not write to this database.',
      'In Atlas > Database Access, give the user the "Read and write to any database" role.',
      detail,
    ].join('\n');
  }
  return `${name}: ${message}`;
}
