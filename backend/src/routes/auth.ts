/**
 * Sign-in. Elders never type a password: a one-time code (Twilio Verify; the
 * fixed DEMO_OTP in demo mode), or an anonymous device session for app
 * installs. Police accounts exist only if an administrator created them.
 */
import { maskPhone } from '@satark/shared';
import { Router } from 'express';
import { z } from 'zod';

import { env, features } from '../config/env';
import { audit, User, type UserDoc } from '../db/models';
import { encrypt, normalizePhone, phoneHash } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { requireAuth, signToken } from '../middleware/auth';
import { authLimiter } from '../middleware/limits';
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
authRouter.post('/device', authLimiter, async (req, res) => {
  const body = z
    .object({
      device_id: z.string().min(8).max(80),
      role: z.enum(['elder', 'guardian', 'listener']).default('elder'),
      phone: phone.optional(),
      push_token: z.string().max(200).optional(),
      ...profile,
    })
    .parse(req.body);
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
  res.json(session(user!));
});

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
