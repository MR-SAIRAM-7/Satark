/** Guardian pairing (6-digit code), family alerts and scam drills. */
import { Router } from 'express';
import { z } from 'zod';

import { Alert, Drill, GuardianLink, oid, User } from '../db/models';
import { randomCode } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { acknowledge } from '../services/alerts';

export const familyRouter = Router();

const readiness = (drills: { passed?: boolean | null }[]) =>
  drills.length ? Math.round((drills.filter((d) => d.passed).length / drills.length) * 100) : null;

/** The elder's phone shows this code; the guardian (or Home Guardian phone) types it in. */
familyRouter.post('/guardian/code', requireAuth('elder'), async (req, res) => {
  const code = randomCode(6);
  const expires = new Date(Date.now() + 15 * 60_000);
  await User.findByIdAndUpdate(req.user!.id, { pairingCode: code, pairingExpires: expires });
  res.json({ code, expires_at: expires.getTime() });
});

familyRouter.post('/guardian/link', requireAuth('guardian', 'listener'), async (req, res) => {
  const { code, relation } = z.object({ code: z.string().regex(/^\d{6}$/), relation: z.string().max(30).optional() }).parse(req.body);
  const elder = await User.findOne({ role: 'elder', pairingCode: code, pairingExpires: { $gt: new Date() } });
  if (!elder) throw new HttpError(404, 'Code not found or expired');
  await GuardianLink.updateOne({ elder: elder._id, guardian: req.user!.id }, { $set: { relation: relation ?? 'family' } }, { upsert: true });
  elder.pairingCode = undefined;
  await elder.save();
  res.status(201).json({ elder: { id: elder.id, name: elder.name, locality: elder.locality } });
});

/** The people this guardian looks after, with what happened recently. */
familyRouter.get('/guardian/elders', requireAuth('guardian', 'listener'), async (req, res) => {
  const links = await GuardianLink.find({ guardian: req.user!.id }).lean();
  const elders = await User.find({ _id: { $in: links.map((l) => l.elder) } }).lean();
  const result = await Promise.all(
    elders.map(async (e) => {
      const [alerts, drills] = await Promise.all([
        Alert.find({ elder: e._id }).sort({ createdAt: -1 }).limit(10),
        Drill.find({ user: e._id }).sort({ createdAt: -1 }).limit(10).lean(),
      ]);
      return {
        id: String(e._id),
        name: e.name,
        locality: e.locality,
        lang: e.lang,
        relation: links.find((l) => String(l.elder) === String(e._id))?.relation,
        readiness: readiness(drills),
        alerts,
      };
    }),
  );
  res.json({ elders: result });
});

familyRouter.get('/alerts', requireAuth(), async (req, res) => {
  const me = req.user!;
  const elderIds = me.role === 'elder' ? [oid(me.id)] : (await GuardianLink.find({ guardian: me.id }).lean()).map((l) => l.elder);
  const alerts = await Alert.find(me.role === 'police' ? {} : { elder: { $in: elderIds } })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ alerts });
});

familyRouter.post('/alerts/:id/ack', requireAuth(), async (req, res) => {
  const alert = await acknowledge(String(req.params.id), req.user!.name || req.user!.role);
  if (!alert) throw new HttpError(404, 'Alert not found');
  res.json({ alert });
});

familyRouter.post('/drill/result', requireAuth(), async (req, res) => {
  const { scenario, passed } = z.object({ scenario: z.string().max(60), passed: z.boolean() }).parse(req.body);
  const drill = await Drill.create({ user: req.user!.id, scenario, passed });
  res.status(201).json({ id: drill.id });
});

familyRouter.get('/drill/readiness', requireAuth(), async (req, res) => {
  const { elder } = z.object({ elder: z.string().max(40).optional() }).parse(req.query);
  if (elder && req.user!.role !== 'police' && !(await GuardianLink.exists({ elder: oid(elder), guardian: req.user!.id }))) {
    throw new HttpError(403, 'Not linked to this person');
  }
  const drills = await Drill.find({ user: elder ? oid(elder) : req.user!.id }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ readiness: readiness(drills), drills: drills.length });
});
