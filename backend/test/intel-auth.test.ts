import { indicatorKey } from '@satark/shared';
import { describe, expect, it } from 'vitest';

import { User } from '../src/db/models';
import { phoneHash, sha256 } from '../src/lib/crypto';
import { api, bearer, signIn, useDatabase } from './helpers';

useDatabase();

const upiHash = sha256(indicatorKey({ type: 'upi', value: 'loan.recovery@ybl' }));
const report = (agent: string, token?: string) => {
  const req = api().post('/v1/report').set('User-Agent', agent);
  if (token) req.set(bearer(token));
  return req.send({ check_id: 'ck_1', scam_type: 'job_task', locality: 'Ameerpet, Hyderabad', indicators: [{ type: 'upi', hash: upiHash, masked: 'loxxx@ybl' }] });
};

describe('auth and roles', () => {
  it('signs in with the demo OTP and rejects a wrong code', async () => {
    const { token, user } = await signIn('+91 91234 00001', { name: 'Kamala' });
    expect(user.role).toBe('elder');
    const me = await api().get('/v1/auth/me').set(bearer(token)).expect(200);
    expect(me.body.user.phone).toBe('+9191XXXXXX01');
    await api().post('/v1/auth/otp/verify').send({ phone: '+919123400001', code: '000000' }).expect(401);
  });

  it('never stores a user phone number in clear', async () => {
    await signIn('+919123400002');
    const user = await User.findOne({ phoneHash: phoneHash('+919123400002') }).lean();
    expect(user?.phoneEnc).toBeDefined();
    expect(JSON.stringify(user)).not.toContain('9123400002');
  });

  it('gives anonymous installs a session and keeps police routes for police', async () => {
    const device = await api().post('/v1/auth/device').send({ device_id: 'test-device-0001', name: 'Ammamma', locality: 'Kukatpally' }).expect(200);
    await api().get('/v1/dashboard/summary').expect(401);
    await api().get('/v1/dashboard/summary').set(bearer(device.body.token)).expect(403);

    await User.create({ role: 'police', name: 'Inspector Test', phoneHash: phoneHash('+919000000999') });
    const police = await signIn('+919000000999', { role: 'elder' });
    expect(police.user.role).toBe('police'); // a role cannot be chosen at sign-in
    await api().get('/v1/dashboard/summary').set(bearer(police.token)).expect(200);
  });
});

describe('community intelligence', () => {
  it('confirms an indicator after three independent reporters, counting each once', async () => {
    const first = await report('phone-a').expect(201);
    expect(first.body.iocs[0]).toMatchObject({ status: 'suspected', reportCount: 1 });
    await report('phone-a').expect(201); // same reporter again
    await report('phone-b').expect(201);
    const third = await report('phone-c').expect(201);
    expect(third.body.iocs[0]).toMatchObject({ status: 'confirmed', reportCount: 3 });
  });

  it('syncs hashes in the phone cache format', async () => {
    const { body } = await api().get('/v1/iocs/sync?since=0').expect(200);
    const ioc = body.iocs.find((i: { hash: string }) => i.hash === upiHash);
    expect(ioc).toMatchObject({ type: 'upi', status: 'confirmed', origin: 'community', scamType: 'job_task' });
    const later = await api().get(`/v1/iocs/sync?since=${body.syncedAt}`).expect(200);
    expect(later.body.iocs).toHaveLength(0);
  });

  it('validates report payloads', async () => {
    await api()
      .post('/v1/report')
      .send({ scam_type: 'job_task', indicators: [{ type: 'upi', hash: 'not-a-hash', masked: 'x' }] })
      .expect(400);
  });
});

describe('guardian pairing', () => {
  it('links a guardian with the elder code', async () => {
    const elder = await signIn('+919123400010', { name: 'Venkata' });
    const guardian = await signIn('+919123400011', { role: 'guardian', name: 'Priya' });
    const { body } = await api().post('/v1/guardian/code').set(bearer(elder.token)).expect(200);
    await api().post('/v1/guardian/link').set(bearer(guardian.token)).send({ code: '000000' }).expect(404);
    await api().post('/v1/guardian/link').set(bearer(guardian.token)).send({ code: body.code, relation: 'daughter' }).expect(201);
    const elders = await api().get('/v1/guardian/elders').set(bearer(guardian.token)).expect(200);
    expect(elders.body.elders[0]).toMatchObject({ name: 'Venkata', relation: 'daughter' });
    // Codes are single use.
    await api().post('/v1/guardian/link').set(bearer(guardian.token)).send({ code: body.code }).expect(404);
  });
});
