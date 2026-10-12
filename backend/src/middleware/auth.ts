/**
 * JWT sessions with role-based access: elder, guardian, listener (Home
 * Guardian phone) and police. Police accounts are created by an administrator
 * (the seed), never by self sign-up.
 *
 * A token is only honoured while its account still exists with the same role:
 * a deleted account, or a device that switched role, gets a 401 and the app
 * signs in again.
 */
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { LRUCache } from 'lru-cache';

import { env } from '../config/env';
import { User, type Role } from '../db/models';
import { HttpError } from '../lib/errors';

export interface AuthUser {
  id: string;
  role: Role;
  name?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const signToken = (user: AuthUser) =>
  jwt.sign({ role: user.role, name: user.name }, env.JWT_SECRET, { subject: user.id, expiresIn: '30d' });

export function verifyToken(token: string | undefined): AuthUser | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return payload.sub ? { id: payload.sub, role: payload.role as Role, name: payload.name as string | undefined } : null;
  } catch {
    return null;
  }
}

/** Accounts recently confirmed to exist with this role (keeps auth to one lookup per user per 30 s). */
const confirmed = new LRUCache<string, Role>({ max: 20_000, ttl: 30_000 });

async function stillValid(user: AuthUser): Promise<boolean> {
  if (confirmed.get(user.id) === user.role) return true;
  const doc = await User.findById(user.id).select('role').lean().catch(() => null);
  if (!doc || doc.role !== user.role) return false;
  confirmed.set(user.id, doc.role);
  return true;
}

/** Call when an account is deleted or changes role, so its old tokens stop working at once. */
export const forgetSession = (userId: string) => confirmed.delete(userId);
export const forgetAllSessions = () => confirmed.clear();

const bearer = (header: string | undefined) => (header?.startsWith('Bearer ') ? header.slice(7) : undefined);

async function authenticate(header: string | undefined): Promise<AuthUser | null | 'invalid'> {
  const token = bearer(header);
  if (!token) return null;
  const user = verifyToken(token);
  return user && (await stillValid(user)) ? user : 'invalid';
}

/**
 * Attach the user when a token is present; anonymous requests continue
 * (rate-limited). A token that is present but no longer valid is a 401, so the
 * app knows to sign in again rather than silently losing its identity.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const user = await authenticate(req.headers.authorization);
  if (user === 'invalid') return next(new HttpError(401, 'Session expired, sign in again'));
  req.user = user ?? undefined;
  next();
};

export const requireAuth =
  (...roles: Role[]): RequestHandler =>
  async (req, _res, next) => {
    const user = await authenticate(req.headers.authorization);
    if (!user || user === 'invalid') return next(new HttpError(401, 'Sign in required'));
    if (roles.length && !roles.includes(user.role)) return next(new HttpError(403, 'Not allowed for this role'));
    req.user = user;
    next();
  };
