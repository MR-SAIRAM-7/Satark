import { describe, expect, it } from 'vitest';

import { explainStartupError } from '../src/lib/startup';

const error = (name: string, message: string, extra: object = {}) => Object.assign(new Error(message), { name, ...extra });

describe('start-up failures are explained in plain words', () => {
  it('names the fix for each common database mistake', () => {
    expect(explainStartupError(error('MongoParseError', 'Invalid scheme, expected connection string to start with "mongodb://"'))).toMatch(/not a valid connection string/);
    expect(explainStartupError(error('MongoServerError', 'bad auth : authentication failed', { code: 8000 }))).toMatch(/rejected the username or password/);
    expect(explainStartupError(error('Error', 'querySrv ENOTFOUND _mongodb._tcp.cluster0.abcde.mongodb.net'))).toMatch(/could not be found/);
    expect(explainStartupError(error('MongooseServerSelectionError', 'connect ECONNREFUSED 127.0.0.1:27017'))).toMatch(/localhost/);
    expect(explainStartupError(error('MongooseServerSelectionError', 'Could not connect to any servers in your MongoDB Atlas cluster'))).toMatch(/Network Access/);
  });

  it('never prints the password from a connection string', () => {
    const text = explainStartupError(error('Error', 'failed for mongodb+srv://satark:s3cret-pass@cluster0.abcde.mongodb.net/satark'));
    expect(text).not.toContain('s3cret-pass');
    expect(text).toContain('mongodb+srv://***@cluster0');
  });
});
