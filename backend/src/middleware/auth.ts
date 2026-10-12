/**
 * JWT sessions with role-based access: elder, guardian, listener (Home
 * Guardian phone) and police. Police accounts are created by an administrator
 * (the seed), never by self sign-up.
 */
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import type { Role } from '../db/models';
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

const bearer = (header: string | undefined) => (header?.startsWith('Bearer ') ? header.slice(7) : undefined);

/** Attach the user when a valid token is present; anonymous requests continue (rate-limited). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  req.user = verifyToken(bearer(req.headers.authorization)) ?? undefined;
  next();
};

export const requireAuth =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const user = verifyToken(bearer(req.headers.authorization));
    if (!user) return next(new HttpError(401, 'Sign in required'));
    if (roles.length && !roles.includes(user.role)) return next(new HttpError(403, 'Not allowed for this role'));
    req.user = user;
    next();
  };
