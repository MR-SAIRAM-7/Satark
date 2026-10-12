/**
 * MongoDB data model (Mongoose). Privacy rules baked into the shape:
 *  - scammers' numbers, UPI IDs and domains are stored as hashes plus a masked
 *    display form (`value` is kept only for indicators the server itself saw);
 *  - users' own phone numbers are encrypted (`phoneEnc`) with a keyed hash for lookup;
 *  - message text is stored masked; reports carry a locality, never a location.
 */
import { FIR_STAGES, type FirStageId } from '@satark/shared';
import { model, Schema, Types, type HydratedDocument, type InferSchemaType } from 'mongoose';

const ROLES = ['elder', 'guardian', 'police', 'listener'] as const;
export type Role = (typeof ROLES)[number];

const SCAM_TYPES = [
  'digital_arrest', 'kyc_bank', 'investment', 'electricity', 'courier', 'lottery', 'job_task',
  'upi_collect', 'malware_apk', 'remote_access', 'family_emergency', 'sim_block', 'phishing_link', 'unknown',
];
const { ObjectId } = Schema.Types;
const geo = { lat: Number, lng: Number };

// --- people -----------------------------------------------------------------------
const userSchema = new Schema(
  {
    role: { type: String, enum: ROLES, required: true, index: true },
    name: { type: String, default: '' },
    phoneHash: { type: String, index: { unique: true, sparse: true } },
    phoneEnc: String,
    phoneMasked: String,
    /** Anonymous app installs sign in with a device id instead of a phone number. */
    deviceId: { type: String, index: { unique: true, sparse: true } },
    lang: { type: String, default: 'en' },
    locality: { type: String, default: 'Hyderabad' },
    pushTokens: { type: [String], default: [] },
    pairingCode: { type: String, index: true },
    pairingExpires: Date,
    /** Police only. */
    badge: String,
    station: String,
  },
  { timestamps: true },
);
export const User = model('User', userSchema);
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

const guardianLinkSchema = new Schema(
  {
    elder: { type: ObjectId, ref: 'User', required: true, index: true },
    guardian: { type: ObjectId, ref: 'User', required: true, index: true },
    relation: { type: String, default: 'family' },
  },
  { timestamps: true },
);
guardianLinkSchema.index({ elder: 1, guardian: 1 }, { unique: true });
export const GuardianLink = model('GuardianLink', guardianLinkSchema);

// --- detection ----------------------------------------------------------------------
const checkSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', index: true },
    clientId: { type: String, index: true },
    source: { type: String, required: true },
    channel: { type: String, enum: ['app', 'whatsapp', 'dashboard', 'listener', 'simulator'], default: 'app' },
    maskedText: { type: String, required: true },
    senderMasked: String,
    threadId: String,
    verdict: { type: String, enum: ['safe', 'suspicious', 'scam'], required: true, index: true },
    score: { type: Number, required: true },
    stage: { type: Number, default: 0 },
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown', index: true },
    layerScores: { rules: Number, killChain: Number, community: Number, ml: Number, ai: Number },
    rules: [String],
    tactics: [String],
    injection: { type: Boolean, default: false },
    engine: String,
    locality: String,
    geo,
    latencyMs: Number,
  },
  { timestamps: true },
);
checkSchema.index({ createdAt: -1 });
export const Check = model('Check', checkSchema);
export type CheckDoc = HydratedDocument<InferSchemaType<typeof checkSchema>>;

// --- community intelligence -----------------------------------------------------------
const iocSchema = new Schema(
  {
    type: { type: String, enum: ['phone', 'upi', 'domain'], required: true },
    hash: { type: String, required: true },
    masked: { type: String, required: true },
    /** Raw value, only when the server saw it itself (WhatsApp forward, seed, police entry). */
    value: String,
    reportCount: { type: Number, default: 0 },
    /** Distinct reporters: three independent reports confirm an indicator. */
    reporters: { type: [String], default: [], select: false },
    status: { type: String, enum: ['suspected', 'confirmed'], default: 'suspected', index: true },
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown' },
    campaign: { type: ObjectId, ref: 'Campaign' },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);
iocSchema.index({ type: 1, hash: 1 }, { unique: true });
export const Ioc = model('Ioc', iocSchema);

const reportSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User' },
    check: { type: ObjectId, ref: 'Check' },
    clientCheckId: String,
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown', index: true },
    locality: { type: String, index: true },
    geo,
    iocs: [{ type: ObjectId, ref: 'Ioc' }],
    channel: { type: String, enum: ['app', 'whatsapp', 'call', 'listener', 'simulator', 'seed'], default: 'app' },
    maskedText: String,
    campaign: { type: ObjectId, ref: 'Campaign', index: true },
  },
  { timestamps: true },
);
reportSchema.index({ createdAt: -1 });
export const Report = model('Report', reportSchema);
export type ReportDoc = HydratedDocument<InferSchemaType<typeof reportSchema>>;

const campaignSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    scamType: { type: String, enum: SCAM_TYPES },
    reportCount: { type: Number, default: 0 },
    localities: [String],
    iocCount: { type: Number, default: 0 },
    sampleText: String,
    firstSeen: Date,
    lastSeen: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const Campaign = model('Campaign', campaignSchema);

// --- complaints: the cyber-cell case queue --------------------------------------------
const evidenceSchema = new Schema(
  { kind: { type: String, enum: ['message', 'transaction', 'call', 'transcript'] }, label: String, content: String, at: Number, sha256: String },
  { _id: false },
);
const personSchema = new Schema({ name: String, phoneEnc: String, phoneMasked: String, relation: String }, { _id: false });

const complaintSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: 'User', index: true },
    clientId: String,
    source: { type: String, enum: ['app', 'golden_hour', 'whatsapp', 'listener', 'seed', 'simulator'], default: 'app' },
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown', index: true },
    elder: { type: personSchema, default: {} },
    guardian: personSchema,
    lang: { type: String, default: 'en' },
    locality: String,
    geo,
    narrative: String,
    summary: String,
    suspect: { phones: [String], upiIds: [String], links: [String] },
    transaction: { type: { type: String }, amount: Number, bank: String, accountTail: String, reference: String, payee: String, payeeVpa: String, at: Number },
    evidence: [evidenceSchema],
    pdf: { key: String, sha256: String, format: { type: String, enum: ['pdf', 'html'] } },
    ackNumber: String,
    firNumber: String,
    stage: { type: String, enum: FIR_STAGES, default: 'kit_ready', index: true },
    timeline: [{ _id: false, stage: { type: String, enum: FIR_STAGES }, at: Date, note: String, by: String }],
    priority: { type: String, enum: ['golden_hour', 'high', 'normal'], default: 'normal', index: true },
    goldenHourEndsAt: Date,
    /** Automation bookkeeping: which reminders have gone out, so none is sent twice. */
    reminders: { type: [String], default: [] },
    assignedTo: String,
    updatesEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);
complaintSchema.index({ createdAt: -1 });
export const Complaint = model('Complaint', complaintSchema);
export type ComplaintDoc = HydratedDocument<InferSchemaType<typeof complaintSchema>>;
export type { FirStageId };

// --- alerts, outbox, drills, audit ----------------------------------------------------------
const alertSchema = new Schema(
  {
    elder: { type: ObjectId, ref: 'User', index: true },
    kind: {
      type: String,
      enum: ['scam_message', 'scam_call', 'call_blocked', 'call_cut', 'money_debited', 'complaint_ready', 'golden_hour', 'escalation'],
      required: true,
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning', index: true },
    title: String,
    summary: String,
    score: Number,
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown' },
    check: { type: ObjectId, ref: 'Check' },
    complaint: { type: ObjectId, ref: 'Complaint' },
    locality: String,
    ackedAt: Date,
    ackedBy: String,
    escalations: { type: Number, default: 0 },
    lastEscalatedAt: Date,
  },
  { timestamps: true },
);
alertSchema.index({ createdAt: -1 });
export const Alert = model('Alert', alertSchema);
export type AlertDoc = HydratedDocument<InferSchemaType<typeof alertSchema>>;

const messageSchema = new Schema(
  {
    channel: { type: String, enum: ['whatsapp', 'push', 'email', 'voice'], required: true },
    toMasked: String,
    audience: { type: String, enum: ['elder', 'guardian', 'police', 'bank', 'public'], default: 'elder' },
    body: String,
    mediaUrl: String,
    status: { type: String, enum: ['sent', 'demo', 'failed', 'skipped'], required: true },
    providerId: String,
    error: String,
    purpose: String,
    complaint: { type: ObjectId, ref: 'Complaint', index: true },
    alert: { type: ObjectId, ref: 'Alert' },
  },
  { timestamps: true },
);
messageSchema.index({ createdAt: -1 });
export const Message = model('Message', messageSchema);

const drillSchema = new Schema(
  { user: { type: ObjectId, ref: 'User', index: true }, scenario: String, passed: Boolean },
  { timestamps: true },
);
export const Drill = model('Drill', drillSchema);

/** The police dashboard's live feed: persisted so a refresh or restart shows the recent history. */
const feedSchema = new Schema(
  {
    type: { type: String, enum: ['check', 'report', 'case', 'alert', 'call', 'escalation', 'ioc', 'system'], required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    title: { type: String, required: true },
    detail: String,
    scamType: { type: String, enum: SCAM_TYPES, default: 'unknown' },
    locality: String,
    geo,
    ref: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
feedSchema.index({ createdAt: -1 });
export const FeedEvent = model('FeedEvent', feedSchema);
export type FeedEventDoc = HydratedDocument<InferSchemaType<typeof feedSchema>>;

/** Server-side event log (STRIDE: repudiation). */
const auditSchema = new Schema(
  { action: { type: String, required: true }, actor: String, target: String, data: Schema.Types.Mixed },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const Audit = model('Audit', auditSchema);

export const audit = (action: string, actor?: string, target?: string, data?: unknown) =>
  Audit.create({ action, actor, target, data }).catch(() => undefined);

export const oid = (id: string) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null);
