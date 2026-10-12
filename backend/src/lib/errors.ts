import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';

import { logger } from './logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => next(new HttpError(404, `No route for ${req.method} ${req.path}`));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: z.flattenError(err).fieldErrors });
    return;
  }
  const status = err instanceof HttpError ? err.status : typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) logger.error({ err, path: req.path }, 'request failed');
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
};
