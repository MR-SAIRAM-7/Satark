/**
 * Turns a start-up failure into one plain sentence about what to fix. A deploy
 * that dies with a bare stack trace (or nothing at all) costs a rebuild to
 * diagnose; almost every real failure here is the database connection string.
 */

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
  if (name === 'MongooseServerSelectionError' || text.includes('server selection') || text.includes('timed out') || text.includes('whitelist')) {
    return [
      'Could not reach the MongoDB cluster.',
      'In Atlas > Network Access, add 0.0.0.0/0 (allow access from anywhere): hosted services have no fixed address.',
      'Also check the cluster is not paused.',
      detail,
    ].join('\n');
  }
  return `${name}: ${message}`;
}
