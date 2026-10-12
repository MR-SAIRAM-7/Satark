/** Police dashboard API (police role only). */
import { type IndicatorType, scamTypeSchema } from '@satark/shared';
import { Router } from 'express';
import { z } from 'zod';

import { Alert, audit, Campaign, FeedEvent, Ioc, Message } from '../db/models';
import { indicatorHash } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import { mapPoints, scamWeather, summary, topIndicators, trends } from '../services/dashboard';
import { huntDomains } from '../services/domainHunt';
import { reportIndicators, toReported } from '../services/intel';
import { buildStixBundle } from '../services/stix';

export const policeRouter = Router();
policeRouter.use(requireAuth('police'));

const hours = z.object({ hours: z.coerce.number().min(1).max(24 * 30).optional() });
const limit = (fallback: number) => z.object({ limit: z.coerce.number().min(1).max(500).default(fallback) });

policeRouter.get('/dashboard/summary', async (_req, res) => {
  res.json(await summary());
});

policeRouter.get('/dashboard/map', async (req, res) => {
  res.json({ points: await mapPoints(hours.parse(req.query).hours ?? 168) });
});

policeRouter.get('/dashboard/trends', async (req, res) => {
  res.json(await trends(hours.parse(req.query).hours ?? 48));
});

policeRouter.get('/dashboard/campaigns', async (_req, res) => {
  res.json({ campaigns: await Campaign.find({ active: true }).sort({ reportCount: -1 }).limit(30).lean() });
});

policeRouter.get('/dashboard/indicators', async (req, res) => {
  const q = z.object({ type: z.enum(['phone', 'upi', 'domain']).optional() }).merge(limit(15)).parse(req.query);
  res.json({ indicators: await topIndicators(q.type, q.limit) });
});

policeRouter.get('/dashboard/feed', async (req, res) => {
  res.json({ events: await FeedEvent.find().sort({ createdAt: -1 }).limit(limit(60).parse(req.query).limit).lean() });
});

policeRouter.get('/dashboard/outbox', async (req, res) => {
  res.json({ messages: await Message.find().sort({ createdAt: -1 }).limit(limit(80).parse(req.query).limit).lean() });
});

policeRouter.get('/dashboard/alerts', async (_req, res) => {
  res.json({ alerts: await Alert.find({ severity: { $ne: 'info' } }).sort({ createdAt: -1 }).limit(40).lean() });
});

policeRouter.get('/dashboard/weather', async (_req, res) => {
  res.json(await scamWeather());
});

policeRouter.get('/stix/export', async (req, res) => {
  const bundle = await buildStixBundle();
  await audit('stix.export', req.user!.name, undefined, { objects: bundle.objects.length });
  res.setHeader('Content-Disposition', `attachment; filename="satark-stix-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(bundle);
});

policeRouter.get('/domains/hunt', async (req, res) => {
  const { brand } = z.object({ brand: z.string().max(20).default('sbi') }).parse(req.query);
  res.json(await huntDomains(brand));
});

/** Look up a raw number, UPI ID or domain against the hashed community intel. */
policeRouter.get('/iocs/lookup', async (req, res) => {
  const { type, value } = z.object({ type: z.enum(['phone', 'upi', 'domain']), value: z.string().min(3).max(200) }).parse(req.query);
  const normalized = type === 'phone' ? `+91${value.replace(/\D/g, '').slice(-10)}` : value.trim().toLowerCase();
  const ioc = await Ioc.findOne({ type, hash: indicatorHash({ type, value: normalized }) }).lean();
  res.json({ found: Boolean(ioc), ioc });
});

/** An officer adds an indicator from their own investigation: confirmed immediately. */
policeRouter.post('/iocs', async (req, res) => {
  const body = z
    .object({ type: z.enum(['phone', 'upi', 'domain']), value: z.string().min(3).max(200), scam_type: scamTypeSchema, locality: z.string().max(80).optional() })
    .parse(req.body);
  const value = body.type === 'phone' ? `+91${body.value.replace(/\D/g, '').slice(-10)}` : body.value.trim().toLowerCase();
  const indicator = toReported({ type: body.type as IndicatorType, value });
  await reportIndicators({ reporter: `police:${req.user!.id}`, indicators: [indicator], scamType: body.scam_type, locality: body.locality, channel: 'call' });
  const ioc = await Ioc.findOneAndUpdate({ type: indicator.type, hash: indicator.hash }, { status: 'confirmed' }, { returnDocument: 'after' });
  await audit('ioc.add', req.user!.name, ioc?.masked);
  res.status(201).json({ ioc });
});
