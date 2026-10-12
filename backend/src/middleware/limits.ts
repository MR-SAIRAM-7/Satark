/** express-rate-limit: flooding /analyze or guessing sign-in codes is throttled per IP. */
import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env';

const limit = (windowMs: number, limit: number) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => env.NODE_ENV === 'test' });

export const globalLimiter = limit(60_000, 600);
export const analyzeLimiter = limit(60_000, 120);
export const authLimiter = limit(10 * 60_000, 30);
/** Device sign-in is cheap and repeats on role switches; several demo phones may share one IP. */
export const deviceLimiter = limit(10 * 60_000, 200);
