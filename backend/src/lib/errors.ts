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
  // A malformed id in the URL ("/alerts/abc") is the caller's mistake, not a server fault.
  if (err?.name === 'CastError') {
    res.status(400).json({ error: `Invalid ${err.path === '_id' ? 'id' : (err.path ?? 'value')}` });
    return;
  }
  // Uploads (multer): too large, or too many files.
  if (err?.name === 'MulterError') {
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
    return;
  }
  const status = err instanceof HttpError ? err.status : typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) logger.error({ err, path: req.path }, 'request failed');
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
};
