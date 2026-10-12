/** The Express app, without a listening server (tests drive it with Supertest). */
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { allowedOrigins } from './config/env';
import { errorHandler, notFound } from './lib/errors';
import { logger } from './lib/logger';
import { globalLimiter } from './middleware/limits';
import { authRouter } from './routes/auth';
import { complaintsRouter } from './routes/complaints';
import { detectionRouter } from './routes/detection';
import { familyRouter } from './routes/family';
import { policeRouter } from './routes/police';
import { healthReport, systemRouter } from './routes/system';
import { whatsappRouter } from './routes/whatsapp';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Native apps send no Origin header and are unaffected; browsers are limited to our own front ends.
  app.use(cors({ origin: allowedOrigins }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      serializers: { req: (req: { method: string; url: string }) => `${req.method} ${req.url}`, res: (res: { statusCode: number }) => res.statusCode },
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' })); // Twilio webhooks
  app.use(globalLimiter);

  const v1 = Router();
  v1.use('/auth', authRouter);
  v1.use(whatsappRouter);
  v1.use(detectionRouter);
  v1.use(familyRouter);
  v1.use(complaintsRouter);
  v1.use(systemRouter);
  v1.use(policeRouter);

  app.get('/', (_req, res) => res.json({ name: 'Satark API', version: '0.1.0', health: '/health', api: '/v1' }));
  app.get('/health', (_req, res) => res.json(healthReport()));
  app.use('/v1', v1);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
