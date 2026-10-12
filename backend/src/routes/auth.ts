/**
 * Sign-in. Elders never type a password: a one-time code (Twilio Verify; the
 * fixed DEMO_OTP in demo mode), or an anonymous device session for app
 * installs. Police accounts exist only if an administrator created them.
 */
import { maskPhone } from '@satark/shared';
import { Router } from 'express';
import type { Types } from 'mongoose';
import { z } from 'zod';

import { env, features } from '../config/env';
import { audit, GuardianLink, User, type Role, type UserDoc } from '../db/models';
import { encrypt, normalizePhone, phoneHash } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { forgetSession, requireAuth, signToken } from '../middleware/auth';
import { authLimiter, deviceLimiter } from '../middleware/limits';
import { twilioClient } from '../services/notify';

export const authRouter = Router();

const phone = z.string().trim().min(8).max(20).regex(/^[+\d\s()-]+$/, 'Phone number');
const profile = {
  name: z.string().trim().max(60).optional(),
  lang: z.string().min(2).max(5).optional(),
  locality: z.string().trim().max(80).optional(),
};

export const publicUser = (u: UserDoc) => ({
  id: u.id,
  role: u.role,
  name: u.name,
  lang: u.lang,
  locality: u.locality,
  phone: u.phoneMasked ?? null,
  badge: u.badge ?? undefined,
  station: u.station ?? undefined,
});

const session = (u: UserDoc) => ({ token: signToken({ id: u.id, role: u.role, name: u.name }), user: publicUser(u) });
const liveOtp = () => features.otp && !env.DEMO_MODE && twilioClient;

authRouter.post('/otp/start', authLimiter, async (req, res) => {
  const body = z.object({ phone }).parse(req.body);
  const client = liveOtp();
  if (client) {
    await client.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID!).verifications.create({ to: normalizePhone(body.phone), channel: 'sms' });
    res.json({ sent: true });
    return;
  }
  res.json({ sent: true, demo: true, hint: `Demo mode: the code is ${env.DEMO_OTP}` });
});

authRouter.post('/otp/verify', authLimiter, async (req, res) => {
  const body = z
    .object({ phone, code: z.string().regex(/^\d{4,8}$/), role: z.enum(['elder', 'guardian', 'listener']).optional(), ...profile })
    .parse(req.body);
  const to = normalizePhone(body.phone);
  const client = liveOtp();
  const ok = client
    ? (await client.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({ to, code: body.code })).status === 'approved'
    : body.code === env.DEMO_OTP;
  if (!ok) throw new HttpError(401, 'Wrong or expired code');

  const user =
    (await User.findOne({ phoneHash: phoneHash(to) })) ??
    (await User.create({
      role: body.role ?? 'elder',
      name: body.name ?? '',
      lang: body.lang ?? 'en',
      locality: body.locality ?? 'Hyderabad',
      phoneHash: phoneHash(to),
      phoneEnc: encrypt(to),
      phoneMasked: maskPhone(to),
    }));
  await audit('auth.login', user.id, user.role);
  res.json(session(user));
});

/** Anonymous install: the app signs in with a random device id, no phone number needed. */
authRouter.post('/device', deviceLimiter, async (req, res) => {
  const body = z
    .object({
      device_id: z.string().min(8).max(80),
      role: z.enum(['elder', 'guardian', 'listener']).default('elder'),
      phone: phone.optional(),
      push_token: z.string().max(200).optional(),
      /** The elder's family contact: alerts reach them on WhatsApp even before they install Satark. */
      guardian: z.object({ name: z.string().trim().max(60).optional(), phone, relation: z.string().max(30).optional() }).optional(),
      ...profile,
    })
    .parse(req.body);

  const user = await deviceUser(body);
  forgetSession(user.id); // the role or identity may have changed: old tokens for this account stop now
  if (user.role === 'elder' && body.guardian) await linkGuardianContact(user._id, body.guardian);
  res.json(session(user));
});

async function deviceUser(body: { device_id: string; role: Role; phone?: string; push_token?: string; name?: string; lang?: string; locality?: string }) {
  // Demo continuity: an install onboarded with a seeded person's number (and role) becomes that person, so
  // the pitch's phone and dashboard tell one story. Outside demo mode a phone number is only claimed by OTP.
  if (env.DEMO_MODE && body.phone) {
    const known = await User.findOne({ phoneHash: phoneHash(normalizePhone(body.phone)), role: body.role });
    if (known) {
      await User.updateMany({ deviceId: body.device_id, _id: { $ne: known._id } }, { $unset: { deviceId: 1 } });
      known.deviceId = body.device_id;
      if (body.locality) known.locality = body.locality;
      if (body.lang) known.lang = body.lang;
      if (body.push_token && !known.pushTokens.includes(body.push_token)) known.pushTokens.push(body.push_token);
      return known.save();
    }
  }
  // An account with a phone number (signed in by OTP, or a seeded person) keeps its role. If its install
  // switches role, the install is detached and becomes an anonymous account of its own.
  const current = await User.findOne({ deviceId: body.device_id });
  if (current?.phoneHash && current.role !== body.role) {
    current.deviceId = undefined;
    await current.save();
  }
  const update = {
    role: body.role,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.lang ? { lang: body.lang } : {}),
    ...(body.locality ? { locality: body.locality } : {}),
    ...(body.phone ? { phoneEnc: encrypt(normalizePhone(body.phone)), phoneMasked: maskPhone(body.phone) } : {}),
  };
  const user = await User.findOneAndUpdate(
    { deviceId: body.device_id },
    { $set: update, ...(body.push_token ? { $addToSet: { pushTokens: body.push_token } } : {}) },
    { upsert: true, returnDocument: 'after' },
  );
  return user!;
}

/** Find or create the family member by their number and link them to the elder. */
async function linkGuardianContact(elderId: Types.ObjectId, contact: { name?: string; phone: string; relation?: string }) {
  const number = normalizePhone(contact.phone);
  const guardian = await User.findOneAndUpdate(
    { phoneHash: phoneHash(number) },
    { $setOnInsert: { role: 'guardian', name: contact.name ?? '', phoneEnc: encrypt(number), phoneMasked: maskPhone(number) } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!guardian || guardian.role === 'police' || guardian._id.equals(elderId)) return;
  await GuardianLink.updateOne({ elder: elderId, guardian: guardian._id }, { $set: { relation: contact.relation ?? 'family' } }, { upsert: true });
}

authRouter.get('/me', requireAuth(), async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new HttpError(404, 'Account not found');
  res.json({ user: publicUser(user) });
});

authRouter.patch('/me', requireAuth(), async (req, res) => {
  const body = z.object({ ...profile, push_token: z.string().max(200).optional() }).parse(req.body);
  const { push_token, ...fields } = body;
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $set: fields, ...(push_token ? { $addToSet: { pushTokens: push_token } } : {}) },
    { returnDocument: 'after' },
  );
  if (!user) throw new HttpError(404, 'Account not found');
  res.json({ user: publicUser(user) });
});
