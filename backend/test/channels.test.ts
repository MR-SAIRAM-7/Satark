import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as connect } from 'socket.io-client';
import { afterAll, describe, expect, it } from 'vitest';

import { GuardianLink, Ioc, Message } from '../src/db/models';
import { indicatorHash } from '../src/lib/crypto';
import { attachRealtime, closeRealtime } from '../src/services/realtime';
import { api, app, bearer, DIGITAL_ARREST, signIn, useDatabase } from './helpers';

useDatabase();

describe('WhatsApp bot (Twilio webhook)', () => {
  const inbound = (Body: string, From = 'whatsapp:+919876500000') =>
    api().post('/v1/whatsapp/inbound').type('form').send({ From, Body }).expect(200).expect('Content-Type', /xml/);

  it('replies with the verdict in the language of the message', async () => {
    const english = await inbound(DIGITAL_ARREST);
    expect(english.text).toContain('SCAM');
    expect(english.text).toContain('1930');

    const telugu = await inbound('మీ ఆధార్ కార్డు మనీ లాండరింగ్ కేసులో ఉంది. ఎవరికీ చెప్పకండి. వెంటనే డబ్బు పంపండి, అరెస్ట్ వారెంట్ వచ్చింది.');
    expect(telugu.text).toMatch(/[ఀ-౿]/);
  });

  it('adds identifiers to the blocklist when the user replies REPORT', async () => {
    await inbound('Dear customer your SBI account will be blocked today. Update KYC at http://sbi-kyc-verify.live now', 'whatsapp:+919876500001');
    const reply = await inbound('REPORT', 'whatsapp:+919876500001');
    expect(reply.text).toContain('added');
    expect(await Ioc.exists({ type: 'domain', value: 'sbi-kyc-verify.live' })).toBeTruthy();
  });
});

describe('WhatsApp delivery receipts (Twilio status webhook)', () => {
  const receipt = (fields: Record<string, string>) => api().post('/v1/whatsapp/status').type('form').send(fields);
  const sent = (providerId: string) =>
    Message.create({ channel: 'whatsapp', toMasked: '+9198XXXXXX10', body: 'Complaint kit ready', status: 'sent', providerId });

  it('moves a sent message to delivered, then read, and never backwards', async () => {
    await sent('SMdelivery0000000000000000000000001');
    const status = async () => (await Message.findOne({ providerId: 'SMdelivery0000000000000000000000001' }))?.status;

    await receipt({ MessageSid: 'SMdelivery0000000000000000000000001', MessageStatus: 'delivered' }).expect(204);
    expect(await status()).toBe('delivered');
    await receipt({ MessageSid: 'SMdelivery0000000000000000000000001', MessageStatus: 'read' }).expect(204);
    await receipt({ MessageSid: 'SMdelivery0000000000000000000000001', MessageStatus: 'sent' }).expect(204);
    expect(await status()).toBe('read');
  });

  it('explains a failure in words: the recipient has not joined the Sandbox', async () => {
    await sent('SMfailed00000000000000000000000002');
    await receipt({ MessageSid: 'SMfailed00000000000000000000000002', MessageStatus: 'undelivered', ErrorCode: '63015' }).expect(204);
    const message = await Message.findOne({ providerId: 'SMfailed00000000000000000000000002' });
    expect(message?.status).toBe('failed');
    expect(message?.errorCode).toBe(63015);
    expect(message?.error).toMatch(/join/i);
  });

  it('accepts a receipt for a message it does not know, so Twilio stops retrying', async () => {
    await receipt({ MessageSid: 'SMunknown0000000000000000000000003', MessageStatus: 'delivered' }).expect(204);
  });
});

describe('Home Guardian live call (F10)', () => {
  let server: Server;
  afterAll(async () => {
    await closeRealtime();
    server?.close();
  });

  it("sends the CUT signal to the elder's phone at stage 4+ and score 85+", async () => {
    server = createServer(app);
    attachRealtime(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const url = `http://localhost:${(server.address() as AddressInfo).port}`;

    const elder = await signIn('+919123400070', { name: 'Lakshmi' });
    const listener = await api().post('/v1/auth/device').send({ device_id: 'listener-test-001', role: 'listener' }).expect(200);
    await GuardianLink.create({ elder: elder.user.id, guardian: listener.body.user.id, relation: 'home guardian phone' });

    const socket = connect(url, { auth: { token: elder.token }, transports: ['websocket'] });
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
    const cut = new Promise<{ stage: number; score: number; countdown: number }>((resolve) => socket.on('cut', resolve));

    const lines = [
      'Hello madam, I am calling from Mumbai Police Crime Branch.',
      'Your Aadhaar is in a money laundering case. An arrest warrant is issued in your name.',
      'Do not tell anyone. Do not disconnect the call.',
      'To clear your name, transfer the amount to the RBI verification account immediately.',
    ];
    let last;
    for (const text of lines) {
      last = await api()
        .post('/v1/listen/text')
        .set(bearer(listener.body.token))
        .send({ session_id: 'call-test-1', text, caller: '+91 90000 54321' })
        .expect(200);
    }
    expect(last!.body.cut).toBe(true);
    const signal = await cut;
    expect(signal.stage).toBeGreaterThanOrEqual(4);
    expect(signal.score).toBeGreaterThanOrEqual(85);
    expect(signal.countdown).toBe(10);
    // The Home Guardian's caller number is reported, so every phone blocks it.
    const blocked = await Ioc.findOne({ type: 'phone', hash: indicatorHash({ type: 'phone', value: '+919000054321' }) }).lean();
    expect(blocked?.reportCount).toBeGreaterThan(0);
    socket.close();
  });
});
