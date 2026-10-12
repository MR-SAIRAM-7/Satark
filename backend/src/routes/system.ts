/** Health, signed file downloads and the demo control room. */
import { extname } from 'node:path';

import { Router } from 'express';
import { z } from 'zod';

import { env, features } from '../config/env';
import { dbReady } from '../db/connect';
import { verifySignedPath } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { liveFeedOn, startLiveFeed, stopLiveFeed } from '../jobs/liveFeed';
import { classifier } from '../services/ml/classifier';
import { browserPath } from '../services/pdf';
import { publish } from '../services/realtime';
import { readLocalFile } from '../services/storage';
import { seed } from '../seed';
import { runScenario, SCENARIOS, type ScenarioName } from '../seed/scenarios';

export const systemRouter = Router();

export function healthReport() {
  return {
    ok: dbReady(),
    mode: env.DEMO_MODE ? 'demo' : 'live',
    integrations: { ...features, pdf: Boolean(browserPath), push: true },
    model: { version: classifier().version, metrics: classifier().metrics },
    liveFeed: liveFeedOn(),
    time: new Date().toISOString(),
  };
}

systemRouter.get('/health', (_req, res) => {
  const report = healthReport();
  res.status(report.ok ? 200 : 503).json(report);
});

const CONTENT_TYPES: Record<string, string> = { '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8' };

/** Local stand-in for S3 presigned URLs: HMAC-signed and expiring. */
systemRouter.get('/files/*key', async (req, res) => {
  const key = ([] as string[]).concat(req.params.key as string | string[]).join('/');
  const { exp, sig } = z.object({ exp: z.coerce.number(), sig: z.string().length(64) }).parse(req.query);
  if (!verifySignedPath(key, exp, sig)) throw new HttpError(403, 'Link expired or invalid');
  const body = await readLocalFile(key).catch(() => null);
  if (!body) throw new HttpError(404, 'File not found');
  res.setHeader('Content-Type', CONTENT_TYPES[extname(key)] ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${key.split('/').pop()}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(body);
});

// --- demo control room (police role) ------------------------------------------------------------
const demo = Router();
demo.use(requireAuth('police'));

demo.get('/status', (_req, res) => {
  res.json({ liveFeed: liveFeedOn(), scenarios: Object.keys(SCENARIOS), demoMode: env.DEMO_MODE });
});

demo.post('/reset', async (_req, res) => {
  stopLiveFeed();
  const counts = await seed();
  await publish({ type: 'system', severity: 'info', title: 'Demo data reset', detail: `${counts.reports} reports, ${counts.cases} cases` });
  res.json(counts);
});

demo.post('/feed', (req, res) => {
  const { on } = z.object({ on: z.boolean() }).parse(req.body);
  if (on) startLiveFeed();
  else stopLiveFeed();
  res.json({ liveFeed: liveFeedOn() });
});

demo.post('/scenario', async (req, res) => {
  const { name, wait } = z.object({ name: z.enum(Object.keys(SCENARIOS) as [ScenarioName]), wait: z.boolean().default(false) }).parse(req.body);
  const run = runScenario(name);
  if (wait) {
    res.json({ name, result: await run });
    return;
  }
  run.catch(() => undefined);
  res.status(202).json({ name, started: true });
});

systemRouter.use('/demo', demo);
