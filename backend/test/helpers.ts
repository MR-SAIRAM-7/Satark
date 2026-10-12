import request from 'supertest';
import { afterAll, beforeAll } from 'vitest';

import { createApp } from '../src/app';
import { connectDb, disconnectDb } from '../src/db/connect';
import { closePdf } from '../src/services/pdf';

export const app = createApp();
export const api = () => request(app);

/** A throwaway in-memory MongoDB for the test file. */
export function useDatabase() {
  beforeAll(async () => {
    await connectDb({ ephemeral: true });
  });
  afterAll(async () => {
    await closePdf();
    await disconnectDb();
  });
}

export async function signIn(phone: string, extra: Record<string, unknown> = {}) {
  await api().post('/v1/auth/otp/start').send({ phone }).expect(200);
  const res = await api().post('/v1/auth/otp/verify').send({ phone, code: '123456', ...extra }).expect(200);
  return res.body as { token: string; user: { id: string; role: string } };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** An app install's anonymous session (what the phone does on first launch). */
export async function device(deviceId: string, extra: Record<string, unknown> = {}) {
  const res = await api().post('/v1/auth/device').send({ device_id: deviceId, ...extra }).expect(200);
  return res.body as { token: string; user: { id: string; role: string } };
}

/** Poll until `check` returns a truthy value (side effects such as alerts run after the response). */
export async function until<T>(check: () => Promise<T>, timeoutMs = 4000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value || Date.now() > deadline) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
}

export const DIGITAL_ARREST =
  'This is Sub-Inspector Vikram Rathod, Mumbai Police Cyber Crime Branch. Your Aadhaar number is linked to a money laundering case. An arrest warrant has been issued in your name. Do not tell anyone. Join the video call now.';
