import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Alert, Campaign, Check, FeedEvent, Ioc, Report, User } from '../src/db/models';
import { phoneHash } from '../src/lib/crypto';
import { seed } from '../src/seed';
import { acknowledge, escalateUnacknowledged } from '../src/services/alerts';
import { buildStixBundle } from '../src/services/stix';
import { api, bearer, signIn, useDatabase } from './helpers';

useDatabase();

describe('seeded demo and the police dashboard', () => {
  let token = '';

  it('seeds a believable fortnight, keeping historical timestamps', async () => {
    const counts = await seed({ days: 7 });
    expect(counts.reports).toBeGreaterThan(100);
    expect(counts.campaigns).toBeGreaterThan(0);
    const oldest = await Check.findOne().sort({ createdAt: 1 }).lean();
    expect(Date.now() - oldest!.createdAt.getTime()).toBeGreaterThan(5 * 86_400_000);
    token = (await signIn('+919000000001')).token; // Inspector Rao from the seed
  });

  it('serves every dashboard panel', async () => {
    const auth = bearer(token);
    const summary = await api().get('/v1/dashboard/summary').set(auth).expect(200);
    expect(summary.body).toMatchObject({ protectedElders: 10 });
    expect(summary.body.amountAtRisk).toBeGreaterThan(0);
    expect(summary.body.goldenHour).toBeGreaterThanOrEqual(1);

    const map = await api().get('/v1/dashboard/map').set(auth).expect(200);
    expect(map.body.points[0]).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number), count: expect.any(Number) });

    const trends = await api().get('/v1/dashboard/trends?hours=72').set(auth).expect(200);
    expect(trends.body.points.length).toBeGreaterThan(5);

    for (const path of ['campaigns', 'indicators', 'feed', 'outbox', 'alerts', 'weather']) {
      await api().get(`/v1/dashboard/${path}`).set(auth).expect(200);
    }
    // Every list item carries an `id` (the dashboard keys and de-duplicates on it).
    const feed = await api().get('/v1/dashboard/feed').set(auth).expect(200);
    expect(feed.body.events.length).toBeGreaterThan(5);
    expect(new Set(feed.body.events.map((e: { id: string }) => e.id)).size).toBe(feed.body.events.length);
    const indicators = await api().get('/v1/dashboard/indicators').set(auth).expect(200);
    expect(indicators.body.indicators[0].id).toBeDefined();
    const weather = await api().get('/v1/dashboard/weather').set(auth).expect(200);
    expect(weather.body.text.te).toMatch(/[ఀ-౿]/);
  });

  it('keeps signed-in sessions valid across a demo reset (seeded accounts keep their ids)', async () => {
    await seed({ days: 2 });
    await api().get('/v1/dashboard/summary').set(bearer(token)).expect(200);
    await seed({ days: 7 });
  });

  it('looks up a raw number against the hashed intel', async () => {
    const { body } = await api().get('/v1/iocs/lookup?type=phone&value=90000 54321').set(bearer(token)).expect(200);
    expect(body.found).toBe(true);
    expect(body.ioc.reportCount).toBe(37);
  });

  it('exports a valid STIX 2.1 bundle', async () => {
    const id = (type: string) => z.string().regex(new RegExp(`^${type}--[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`));
    const common = { spec_version: z.literal('2.1'), created: z.iso.datetime(), modified: z.iso.datetime() };
    const indicator = z.object({ type: z.literal('indicator'), id: id('indicator'), ...common, pattern: z.string().regex(/^\[.+\]$/), pattern_type: z.literal('stix'), valid_from: z.iso.datetime() });

    const res = await api().get('/v1/stix/export').set(bearer(token)).expect(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    const bundle = res.body as { type: string; id: string; objects: { type: string }[] };
    expect(bundle.type).toBe('bundle');
    expect(id('bundle').safeParse(bundle.id).success).toBe(true);
    const indicators = bundle.objects.filter((o) => o.type === 'indicator');
    expect(indicators.length).toBeGreaterThan(10);
    for (const o of indicators) expect(indicator.safeParse(o).success).toBe(true);
    expect(JSON.stringify(indicators)).toContain("[domain-name:value = 'sbi-yono-kyc.xyz']");
    expect(bundle.objects.some((o) => o.type === 'campaign')).toBe(true);
    // Raw phone numbers never leave in the export.
    expect(JSON.stringify(await buildStixBundle())).not.toContain('9000054321');
  });

  it('runs a demo scenario end to end', async () => {
    const res = await api().post('/v1/demo/scenario').set(bearer(token)).send({ name: 'scam_wave', wait: true }).expect(200);
    const ioc = await Ioc.findOne({ masked: { $regex: '^lo' }, type: 'upi' }).lean();
    expect(res.body.result.reports).toBe(5);
    expect(ioc?.status).toBe('confirmed');
    expect(await FeedEvent.exists({ type: 'ioc' })).toBeTruthy();
  }, 30_000);
});

describe('alert escalation', () => {
  it('re-notifies and raises the dashboard alarm when a critical alert is ignored', async () => {
    await Alert.deleteMany({});
    const elder = await User.create({ role: 'elder', name: 'Prabhakar', phoneHash: phoneHash('+919111199999'), locality: 'Uppal' });
    const alert = await Alert.create({ elder: elder._id, kind: 'scam_call', severity: 'critical', title: 'Live scam call', summary: 'Stage 4', createdAt: new Date(Date.now() - 10 * 60_000) });

    expect(await escalateUnacknowledged()).toBe(1);
    expect(await escalateUnacknowledged()).toBe(0); // waits another interval before repeating
    expect((await Alert.findById(alert._id))?.escalations).toBe(1);
    expect(await FeedEvent.exists({ type: 'escalation', severity: 'critical' })).toBeTruthy();

    await acknowledge(alert.id, 'Ravi');
    expect(await escalateUnacknowledged(new Date(Date.now() + 60 * 60_000))).toBe(0);
  });
});

describe('campaign clustering', () => {
  it('groups reports that share an indicator', async () => {
    const before = await Campaign.countDocuments({ active: true });
    const ioc = await Ioc.create({ type: 'domain', hash: 'f'.repeat(64), masked: 'ne***ok.top', reportCount: 3, status: 'confirmed', scamType: 'kyc_bank' });
    await Report.insertMany(['Ameerpet', 'Uppal', 'Abids'].map((locality) => ({ scamType: 'kyc_bank', locality, iocs: [ioc._id] })));
    const { clusterCampaigns } = await import('../src/services/campaigns');
    expect(await clusterCampaigns()).toBeGreaterThan(0);
    expect(await Campaign.countDocuments({ active: true })).toBeGreaterThanOrEqual(before);
    expect((await Ioc.findById(ioc._id))?.campaign).toBeTruthy();
  });
});
