/**
 * Complaint Kit and cases. The app files a case (POST /complaint); the cyber
 * cell works it from the dashboard (/cases); every stage change messages the
 * family automatically.
 */
import { FIR_STAGES, scamTypeSchema } from '@satark/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';

import { Complaint, Message, oid, type ComplaintDoc } from '../db/models';
import { HttpError } from '../lib/errors';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { advanceCase, createCase, kitLink, saveAcknowledgement } from '../services/complaints';
import { sendWhatsApp } from '../services/notify';

export const complaintsRouter = Router();

const phone = z.string().trim().max(20).regex(/^[+\d\s()-]*$/);
const person = z.object({ name: z.string().max(60).optional(), phone: phone.optional(), relation: z.string().max(30).optional() });

const createSchema = z.object({
  client_id: z.string().max(64).optional(),
  scam_type: scamTypeSchema,
  lang: z.string().min(2).max(5).default('en'),
  locality: z.string().max(80).optional(),
  channel: z.string().max(40).optional(),
  elder: person.default({}),
  guardian: person.nullish(),
  narrative: z.string().max(20_000).optional(),
  summary: z.string().max(2000).optional(),
  suspect: z
    .object({ phones: z.array(z.string().max(32)).max(20), upiIds: z.array(z.string().max(80)).max(20), links: z.array(z.string().max(200)).max(20) })
    .partial()
    .optional(),
  transaction: z
    .object({
      type: z.enum(['debit', 'credit']).default('debit'),
      amount: z.number().positive(),
      bank: z.string().max(60).optional(),
      accountTail: z.string().max(8).optional(),
      reference: z.string().max(40).optional(),
      payee: z.string().max(80).optional(),
      payeeVpa: z.string().max(80).optional(),
      at: z.number(),
    })
    .nullish(),
  evidence: z
    .array(
      z.object({
        kind: z.enum(['message', 'transaction', 'call', 'transcript']),
        label: z.string().max(120),
        content: z.string().max(4000),
        at: z.number(),
      }),
    )
    .max(50)
    .default([]),
});

/** Owners and police may read a case; nobody else. */
async function loadCase(req: Request): Promise<ComplaintDoc> {
  const id = String(req.params.id);
  const complaint = oid(id) ? await Complaint.findById(id) : await Complaint.findOne({ ref: id });
  if (!complaint) throw new HttpError(404, 'Complaint not found');
  const me = req.user;
  if (me?.role !== 'police' && (!me || String(complaint.user) !== me.id)) throw new HttpError(403, 'Not your complaint');
  return complaint;
}

complaintsRouter.post('/complaint', optionalAuth, async (req, res) => {
  const body = createSchema.parse(req.body);
  const complaint = await createCase({
    userId: req.user?.role === 'police' ? undefined : req.user?.id,
    clientId: body.client_id,
    source: 'app',
    scamType: body.scam_type,
    lang: body.lang,
    locality: body.locality,
    channel: body.channel,
    elder: body.elder,
    guardian: body.guardian,
    narrative: body.narrative,
    summary: body.summary,
    suspect: body.suspect,
    transaction: body.transaction ?? null,
    evidence: body.evidence,
  });
  const kit = await kitLink(complaint).catch(() => null);
  res.status(201).json({
    id: complaint.id,
    ref: complaint.ref,
    stage: complaint.stage,
    priority: complaint.priority,
    pdf_url: kit?.url ?? null,
    pdf_sha256: kit?.sha256 ?? null,
    pdf_format: kit?.format ?? null,
    evidence: complaint.evidence.map((e) => ({ label: e.label, sha256: e.sha256 })),
  });
});

/** WhatsApp delivery for the app's tracker messages. */
complaintsRouter.post('/complaint/send', optionalAuth, async (req, res) => {
  const body = z
    .object({ to: phone.min(8), body: z.string().min(1).max(1500), media_url: z.string().url().optional(), complaint_id: z.string().max(40).optional() })
    .parse(req.body);
  const complaint = body.complaint_id ? await Complaint.findOne({ $or: [{ ref: body.complaint_id }, { clientId: body.complaint_id }] }) : null;
  const status = await sendWhatsApp(body.to, body.body, { mediaUrl: body.media_url, purpose: 'app_update', complaint: complaint?._id });
  res.status(status === 'failed' ? 502 : 200).json({ status });
});

complaintsRouter.get('/complaints', requireAuth(), async (req, res) => {
  const complaints = await Complaint.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ complaints });
});

complaintsRouter.get('/complaints/:id', requireAuth(), async (req, res) => {
  const complaint = await loadCase(req);
  const messages = await Message.find({ complaint: complaint._id }).sort({ createdAt: 1 }).lean();
  res.json({ complaint, messages });
});

/** A fresh short-lived link to the kit (rendered on first request). */
complaintsRouter.get('/complaints/:id/kit', requireAuth(), async (req, res) => {
  const kit = await kitLink(await loadCase(req));
  if (req.query.redirect === '1') res.redirect(kit.url);
  else res.json(kit);
});

complaintsRouter.post('/complaints/:id/ack', requireAuth(), async (req, res) => {
  const { ack_number } = z.object({ ack_number: z.string().trim().min(4).max(40) }).parse(req.body);
  const complaint = await saveAcknowledgement(await loadCase(req), ack_number, req.user!.name || req.user!.role);
  res.json({ complaint });
});

// --- the cyber cell's queue (police only) --------------------------------------------------
complaintsRouter.get('/cases', requireAuth('police'), async (req, res) => {
  const q = z
    .object({ stage: z.enum(FIR_STAGES).optional(), priority: z.enum(['golden_hour', 'high', 'normal']).optional(), open: z.enum(['1', '0']).optional() })
    .parse(req.query);
  const query = Complaint.find();
  if (q.stage) query.where('stage').equals(q.stage);
  if (q.priority) query.where('priority').equals(q.priority);
  if (q.open === '1') query.where('stage').ne('io_assigned');
  const cases = await query.sort({ priority: 1, createdAt: -1 }).limit(200).select('-narrative -evidence.content');
  res.json({ cases });
});

complaintsRouter.get('/cases/:id', requireAuth('police'), async (req, res) => {
  const complaint = await loadCase(req);
  const messages = await Message.find({ complaint: complaint._id }).sort({ createdAt: 1 }).lean();
  res.json({ complaint, messages });
});

complaintsRouter.patch('/cases/:id', requireAuth('police'), async (req, res) => {
  const body = z
    .object({
      stage: z.enum(FIR_STAGES),
      note: z.string().max(500).optional(),
      ack_number: z.string().max(40).optional(),
      fir_number: z.string().max(40).optional(),
      assigned_to: z.string().max(80).optional(),
    })
    .parse(req.body);
  const complaint = await advanceCase(await loadCase(req), {
    stage: body.stage,
    note: body.note,
    by: req.user!.name || 'Cyber cell',
    ackNumber: body.ack_number,
    firNumber: body.fir_number,
    assignedTo: body.assigned_to,
  });
  res.json({ complaint });
});
