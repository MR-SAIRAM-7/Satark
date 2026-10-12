/** The routes the Satark app calls (services/api/http.ts in the mobile app). */
import { analyzeRequestSchema, parseTxnSms, scamTypeSchema } from '@satark/shared';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { HttpError } from '../lib/errors';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { analyzeLimiter } from '../middleware/limits';
import { stt, translateMany, tts } from '../services/ai/sarvam';
import { analyzeMessage } from '../services/analysis';
import { goldenHourCase } from '../services/complaints';
import { reportIndicators, syncIocs } from '../services/intel';
import { addLine, getSession } from '../services/listen';

export const detectionRouter = Router();
const app = requireAuth('elder', 'guardian', 'listener');

/** Anyone may ask "is this safe?" (rate-limited); a signed-in elder's checks also alert their family. */
detectionRouter.post('/analyze', analyzeLimiter, optionalAuth, async (req, res) => {
  const body = analyzeRequestSchema.parse(req.body);
  const { response, explain } = await analyzeMessage(body, { user: req.user, channel: req.user?.role === 'police' ? 'dashboard' : 'app' });
  res.json({ ...response, ...explain });
});

detectionRouter.post('/tts', app, async (req, res) => {
  const { text, lang } = z.object({ text: z.string().min(1).max(2400), lang: z.string().min(2).max(5) }).parse(req.body);
  res.json({ audio: await tts(text, lang).catch(() => null) });
});

detectionRouter.post('/translate', app, async (req, res) => {
  const { texts, lang } = z.object({ texts: z.array(z.string().max(2000)).max(400), lang: z.string().min(2).max(5) }).parse(req.body);
  res.json({ texts: await translateMany(texts, lang).catch(() => null) });
});

// Audio is held in memory only, 2 MB at most (about 5 seconds of WAV with headroom).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

detectionRouter.post('/listen', app, upload.single('audio'), async (req, res) => {
  const { session_id, caller } = z.object({ session_id: z.string().min(4).max(64), caller: z.string().max(32).optional() }).parse(req.body);
  if (!req.file) throw new HttpError(400, 'audio file required');
  if (!/^audio\//.test(req.file.mimetype) && req.file.mimetype !== 'application/octet-stream') throw new HttpError(415, 'Audio only');
  assertSessionOwner(session_id, req.user!.id);
  const heard = await stt(req.file.buffer, req.file.mimetype).catch(() => null);
  if (!heard) {
    res.status(503).json({ error: 'Speech-to-text unavailable', transcript: '' });
    return;
  }
  const state = await addLine(session_id, heard.transcript, req.user, caller);
  res.json({ transcript: heard.transcript, lang: heard.lang, stage: state.stage, score: state.score, cut: state.cut, evidence: state.evidence });
});

/** Text lines for the Home Guardian (demo script, or on-device speech recognition). */
detectionRouter.post('/listen/text', app, async (req, res) => {
  const { session_id, text, caller } = z
    .object({ session_id: z.string().min(4).max(64), text: z.string().min(1).max(1000), caller: z.string().max(32).optional() })
    .parse(req.body);
  assertSessionOwner(session_id, req.user!.id);
  const state = await addLine(session_id, text, req.user, caller);
  res.json({ transcript: text, stage: state.stage, score: state.score, cut: state.cut, evidence: state.evidence });
});

detectionRouter.get('/listen/:sessionId', app, (req, res) => {
  const state = getSession(String(req.params.sessionId));
  if (!state || state.owner !== req.user!.id) throw new HttpError(404, 'No such session');
  res.json(state);
});

/** A live-call session belongs to the phone that started it. */
function assertSessionOwner(sessionId: string, userId: string) {
  const state = getSession(sessionId);
  if (state && state.owner !== userId) throw new HttpError(403, 'This listening session belongs to another phone');
}

const reportSchema = z.object({
  check_id: z.string().max(64).optional(),
  scam_type: scamTypeSchema,
  locality: z.string().max(80).default('Hyderabad'),
  indicators: z
    .array(z.object({ type: z.enum(['phone', 'upi', 'domain']), hash: z.string().regex(/^[a-f0-9]{64}$/), masked: z.string().max(80) }))
    .max(20),
});

/** One report per account: three different accounts confirm an indicator. */
detectionRouter.post('/report', app, async (req, res) => {
  const body = reportSchema.parse(req.body);
  const { report, iocs } = await reportIndicators({
    reporter: req.user!.id,
    userId: req.user?.id,
    indicators: body.indicators,
    scamType: body.scam_type,
    locality: body.locality,
    clientCheckId: body.check_id,
    channel: 'app',
  });
  res.status(201).json({ id: report.id, iocs: iocs.map((i) => ({ hash: i.hash, status: i.status, reportCount: i.reportCount })) });
});

detectionRouter.get('/iocs/sync', async (req, res) => {
  const { since } = z.object({ since: z.coerce.number().min(0).default(0) }).parse(req.query);
  res.json({ iocs: await syncIocs(since), syncedAt: Date.now() });
});

const txnSchema = z.object({
  text: z.string().max(1000).optional(),
  sender: z.string().max(32).optional(),
  txn: z
    .object({
      type: z.enum(['debit', 'credit']),
      amount: z.number().positive(),
      bank: z.string().max(60).optional(),
      accountTail: z.string().max(8).optional(),
      reference: z.string().max(40).optional(),
      payee: z.string().max(80).optional(),
      payeeVpa: z.string().max(80).optional(),
    })
    .optional(),
  at: z.number().optional(),
  related_check_id: z.string().max(64).optional(),
});

/** F11: a parsed debit SMS. Within 60 minutes of a high-risk check, the golden-hour case opens itself. */
detectionRouter.post('/txn/check', requireAuth('elder'), async (req, res) => {
  const body = txnSchema.parse(req.body);
  const txn = body.txn ?? (body.text ? parseTxnSms(body.text, body.sender) : null);
  if (!txn) throw new HttpError(400, 'Not a bank transaction message');
  const result = await goldenHourCase({ userId: req.user!.id, txn, at: body.at ?? Date.now(), relatedClientId: body.related_check_id });
  if (!result) {
    res.json({ golden_hour: false, txn });
    return;
  }
  res.status(201).json({
    golden_hour: true,
    txn,
    minutes_after: result.minutesAfter,
    script: result.script,
    complaint: { id: result.complaint.id, ref: result.complaint.ref, stage: result.complaint.stage },
  });
});
