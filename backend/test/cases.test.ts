import { describe, expect, it } from 'vitest';

import { Alert, Complaint, GuardianLink, Message, User } from '../src/db/models';
import { phoneHash } from '../src/lib/crypto';
import { goldenHourReminders } from '../src/services/complaints';
import { api, bearer, device, DIGITAL_ARREST, signIn, useDatabase } from './helpers';

useDatabase();

async function police() {
  await User.create({ role: 'police', name: 'Inspector Rao', phoneHash: phoneHash('+919000000001') });
  return signIn('+919000000001');
}

const kit = (overrides: Record<string, unknown> = {}) => ({
  client_id: 'sat_kit_1',
  scam_type: 'digital_arrest',
  lang: 'te',
  locality: 'Kukatpally',
  elder: { name: 'Lakshmi', phone: '+919000000101' },
  guardian: { name: 'Ravi', phone: '+919000000201', relation: 'son' },
  suspect: { phones: ['+919848012345'], upiIds: ['rbi.verify@ybl'] },
  transaction: { amount: 125000, bank: 'SBI', reference: 'SBIN123456789', at: Date.now() - 5 * 60_000 },
  evidence: [{ kind: 'message', label: 'WhatsApp message', content: DIGITAL_ARREST, at: Date.now() - 20 * 60_000 }],
  ...overrides,
});

describe('Complaint Kit and the cyber-cell queue', () => {
  let caseId = '';
  let ref = '';
  let elderToken = '';

  it('files a case with hashed evidence, a kit, and WhatsApp to the family', async () => {
    const elder = await device('kit-elder-device', { name: 'Lakshmi', phone: '+919000000101', guardian: { name: 'Ravi', phone: '+919000000201' } });
    elderToken = elder.token;
    await api().post('/v1/complaint').send(kit()).expect(401); // filing needs an app session

    const res = await api().post('/v1/complaint').set(bearer(elderToken)).send(kit()).expect(201);
    caseId = res.body.id;
    ref = res.body.ref;
    expect(res.body.ref).toMatch(/^SAT-\d{6}-\d{4}$/);
    expect(res.body.priority).toBe('golden_hour');
    expect(res.body.evidence).toHaveLength(2); // the message and the debit
    expect(res.body.evidence[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.messages.map((m: { audience: string }) => m.audience).sort()).toEqual(['elder', 'guardian']);

    // The kit downloads through the signed, expiring link.
    const url = new URL(res.body.pdf_url);
    const file = await api().get(url.pathname + url.search).expect(200);
    expect(file.headers['content-type']).toMatch(res.body.pdf_format === 'pdf' ? /pdf/ : /html/);
    await api().get(url.pathname + url.search.replace(/sig=\w+/, `sig=${'0'.repeat(64)}`)).expect(403);

    const messages = await Message.find({ complaint: caseId, purpose: 'kit_ready' }).lean();
    expect(messages.every((m) => m.status === 'demo' && m.toMasked?.includes('X'))).toBe(true);
    expect(await Alert.exists({ kind: 'golden_hour' })).toBeTruthy();
  });

  it('is idempotent: a retried filing returns the same case and messages nobody twice', async () => {
    const again = await api().post('/v1/complaint').set(bearer(elderToken)).send(kit()).expect(200);
    expect(again.body.ref).toBe(ref);
    expect(await Complaint.countDocuments()).toBe(1);
    expect(await Message.countDocuments({ complaint: caseId, purpose: 'kit_ready' })).toBe(2);
  });

  it('lets the victim record calling 1930; the server tells the family', async () => {
    const res = await api().post(`/v1/complaints/${ref}/stage`).set(bearer(elderToken)).send({ stage: 'helpline_1930' }).expect(200);
    expect(res.body.stage).toBe('helpline_1930');
    expect(res.body.messages).toHaveLength(2);
    await api().post(`/v1/complaints/${ref}/stage`).set(bearer(elderToken)).send({ stage: 'io_assigned' }).expect(400); // police only
    const detail = await api().get(`/v1/complaints/${ref}`).set(bearer(elderToken)).expect(200);
    expect(detail.body.complaint.timeline.map((t: { stage: string }) => t.stage)).toEqual(['kit_ready', 'helpline_1930']);
  });

  it('lets the cyber cell move the case on, messaging the family and the bank automatically', async () => {
    const { token } = await police();
    const queue = await api().get('/v1/cases?open=1').set(bearer(token)).expect(200);
    expect(queue.body.cases[0].priority).toBe('golden_hour');

    const res = await api().patch(`/v1/cases/${caseId}`).set(bearer(token)).send({ stage: 'bank_hold', note: 'Lien marked by SBI nodal officer' }).expect(200);
    expect(res.body.complaint.stage).toBe('bank_hold');
    expect(await Message.countDocuments({ complaint: caseId, purpose: 'bank_hold', channel: 'whatsapp' })).toBe(2);
    expect(await Message.countDocuments({ complaint: caseId, channel: 'email', audience: 'bank' })).toBe(1);

    // Repeating a stage does not message anyone twice.
    await api().patch(`/v1/cases/${caseId}`).set(bearer(token)).send({ stage: 'bank_hold' }).expect(200);
    expect(await Message.countDocuments({ complaint: caseId, purpose: 'bank_hold', channel: 'whatsapp' })).toBe(2);

    const detail = await api().get(`/v1/cases/${caseId}`).set(bearer(token)).expect(200);
    expect(detail.body.complaint.narrative).toContain('INCIDENT DETAILS');
    expect(detail.body.messages.length).toBeGreaterThanOrEqual(7);
  });

  it('keeps cases private to their owner and the police', async () => {
    const stranger = await signIn('+919123499999');
    await api().get(`/v1/complaints/${caseId}`).set(bearer(stranger.token)).expect(403);
    await api().patch(`/v1/cases/${caseId}`).set(bearer(stranger.token)).send({ stage: 'zero_fir' }).expect(403);
  });

  it('only sends WhatsApp to the user and their linked family, never to anyone else', async () => {
    const send = (to: string) => api().post('/v1/complaint/send').set(bearer(elderToken)).send({ to, body: 'Satark update' });
    expect((await send('+91 90000 00101')).status).toBe(200); // the elder
    expect((await send('+919000000201')).status).toBe(200); // the linked son
    expect((await send('+919876543210')).status).toBe(403); // a stranger
  });
});

describe('golden hour (F11)', () => {
  it('opens a case by itself when money leaves within the hour of a scam, and merges the kit the phone files later', async () => {
    const elder = await signIn('+919123400050', { name: 'Sarojini', locality: 'Secunderabad' });
    const guardian = await signIn('+919123400051', { role: 'guardian' });
    await GuardianLink.create({ elder: elder.user.id, guardian: guardian.user.id });

    await api()
      .post('/v1/analyze')
      .set(bearer(elder.token))
      .send({ source: 'whatsapp', sender: '+919848012345', text: DIGITAL_ARREST, lang: 'en', thread_id: 'wa:1', client_id: 'ck_phone_1' })
      .expect(200);
    const res = await api()
      .post('/v1/txn/check')
      .set(bearer(elder.token))
      .send({ text: 'Dear UPI user A/C X4321 debited by 1,25,000.00 on date 12Oct26 trf to rbi.verify@ybl Refno 628519874410. -SBI', sender: 'VM-SBIUPI-S' })
      .expect(201);
    expect(res.body.golden_hour).toBe(true);
    expect(res.body.txn).toMatchObject({ type: 'debit', amount: 125000, reference: '628519874410' });
    expect(res.body.script[0]).toContain('online financial fraud');

    const complaint = await Complaint.findById(res.body.complaint.id);
    expect(complaint?.priority).toBe('golden_hour');
    expect(complaint?.suspect?.upiIds).toContain('rbi.verify@ybl');
    expect(complaint?.clientIds).toContain('ck_phone_1');

    // The phone then files its own kit for the same conversation: one case, not two.
    const filed = await api()
      .post('/v1/complaint')
      .set(bearer(elder.token))
      .send(kit({ client_id: 'sat_phone_kit', related_check_ids: ['ck_phone_1'], elder: { name: 'Sarojini' }, guardian: null }))
      .expect(200);
    expect(filed.body.ref).toBe(complaint!.ref);
    expect(filed.body.merged).toBe(true);
    expect(await Complaint.countDocuments({ user: elder.user.id })).toBe(1);

    // Reminders at 10, 30 and 50 minutes until someone acts; never twice.
    const at = (min: number) => new Date(complaint!.goldenHourEndsAt!.getTime() - 60 * 60_000 + min * 60_000);
    expect(await goldenHourReminders(at(11))).toBe(1);
    expect(await goldenHourReminders(at(12))).toBe(0);
    expect(await goldenHourReminders(at(31))).toBe(1);
    expect(await Message.countDocuments({ complaint: complaint!._id, purpose: 'golden_hour_reminder' })).toBe(2);
  });

  it('does nothing for a debit with no scam before it', async () => {
    const elder = await signIn('+919123400060');
    const res = await api().post('/v1/txn/check').set(bearer(elder.token)).send({ txn: { type: 'debit', amount: 650 } }).expect(200);
    expect(res.body.golden_hour).toBe(false);
  });
});
