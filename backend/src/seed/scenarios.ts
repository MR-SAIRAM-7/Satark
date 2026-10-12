/**
 * One-click demo storylines for the pitch, run against the live services so
 * every alert, WhatsApp message and dashboard alarm is the real automation.
 */
import type { IndicatorType, ScamType } from '@satark/shared';

import { env } from '../config/env';
import { Alert, User } from '../db/models';
import { escalateUnacknowledged } from '../services/alerts';
import { analyzeMessage } from '../services/analysis';
import { clusterCampaigns } from '../services/campaigns';
import { goldenHourCase } from '../services/complaints';
import { reportIndicators, toReported } from '../services/intel';
import { addLine } from '../services/listen';
import { publish } from '../services/realtime';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const lakshmi = async () => {
  const user = await User.findOne({ deviceId: 'demo-elder-lakshmi' });
  if (!user) throw new Error('Demo data missing: reset the demo first');
  return user;
};

/** Journey 1 + 3: a digital-arrest conversation, then a debit inside the hour. */
async function goldenHour() {
  const elder = await lakshmi();
  const auth = { id: elder.id, role: 'elder' as const, name: elder.name };
  const thread = `whatsapp:+919848012345:${Date.now()}`;
  const lines = [
    'This is Sub-Inspector Vikram Rathod, Mumbai Police Cyber Crime Branch. Your Aadhaar number is linked to a money laundering case.',
    'An arrest warrant has been issued in your name. Do not tell anyone, not even your son. Stay on the video call.',
    'To clear your name transfer Rs 1,25,000 to the RBI verification account rbi.verify@ybl immediately. It will be refunded in 24 hours.',
  ];
  let last;
  for (const [i, text] of lines.entries()) {
    last = await analyzeMessage(
      { source: 'whatsapp', sender: '+91 98480 12345', text, lang: elder.lang, thread_id: thread, client_id: `demo-${Date.now()}-${i}` },
      { user: auth, channel: 'app' },
    );
    await wait(1500);
  }
  await wait(2500);
  const result = await goldenHourCase({
    userId: elder.id,
    txn: { type: 'debit', amount: 125000, bank: 'SBI', accountTail: '4321', reference: `SBIN${Date.now().toString().slice(-9)}`, payeeVpa: 'rbi.verify@ybl' },
    at: Date.now(),
  });
  return { verdict: last?.response.verdict, stage: last?.response.stage, case: result?.complaint.ref };
}

/** A new UPI ID reported from five localities in a minute: confirmed, blocked, clustered. */
async function scamWave() {
  const upi = `loan.recovery${Math.floor(100 + Math.random() * 900)}@ybl`;
  const places = ['Kukatpally', 'Ameerpet', 'Dilsukhnagar', 'Uppal', 'Madhapur'];
  const indicator = toReported({ type: 'upi' as IndicatorType, value: upi });
  for (const [i, locality] of places.entries()) {
    await reportIndicators({
      reporter: `wave:${i}`,
      indicators: [indicator],
      scamType: 'job_task' as ScamType,
      locality,
      channel: 'app',
      maskedText: `Your instant loan EMI is overdue. Pay Rs 4,999 to ${upi} today or your photos will be sent to your contacts.`,
    });
    await wait(1800);
  }
  await clusterCampaigns();
  return { upi, reports: places.length };
}

/** Journey 2: the Home Guardian hears a digital-arrest call; the countdown starts on the elder's phone. */
async function callCut() {
  const listener = await User.findOne({ deviceId: 'demo-home-guardian' });
  const auth = listener ? { id: listener.id, role: 'listener' as const, name: listener.name } : undefined;
  const session = `demo-call-${Date.now()}`;
  const script = [
    'Hello madam, I am calling from Mumbai Police Crime Branch.',
    'మీ ఆధార్ కార్డు ఒక మనీ లాండరింగ్ కేసులో ఉంది. మీ పేరు మీద అరెస్ట్ వారెంట్ వచ్చింది.',
    'ఈ విషయం ఎవరికీ చెప్పకండి. కాల్ కట్ చేయకండి, do not disconnect.',
    'To clear your name, transfer the amount to the RBI verification account immediately.',
  ];
  let state;
  for (const line of script) {
    state = await addLine(session, line, auth, '+919000054321');
    await wait(2200);
  }
  return { session, stage: state?.stage, score: state?.score, cut: state?.cut };
}

/** A critical alert nobody acknowledged: the guardian is reminded and the dashboard alarm sounds. */
async function escalation() {
  const elder = await lakshmi();
  await Alert.create({
    elder: elder._id,
    kind: 'scam_call',
    severity: 'critical',
    title: `${elder.name} is on a call with a suspected scammer`,
    summary: 'Stage 4 (isolation): the caller told her not to tell anyone. Nobody has acknowledged the alert.',
    score: 91,
    scamType: 'digital_arrest',
    locality: elder.locality,
    createdAt: new Date(Date.now() - (env.ESCALATE_AFTER_MIN + 1) * 60_000),
  });
  return { escalated: await escalateUnacknowledged() };
}

export const SCENARIOS = { golden_hour: goldenHour, scam_wave: scamWave, call_cut: callCut, escalation } as const;
export type ScenarioName = keyof typeof SCENARIOS;

/** Scenarios run in the background so the dashboard animates as each step lands. */
export function runScenario(name: ScenarioName) {
  void publish({ type: 'system', severity: 'info', title: `Demo scenario started: ${name.replace(/_/g, ' ')}` });
  return SCENARIOS[name]().catch(async (err: Error) => {
    await publish({ type: 'system', severity: 'warning', title: `Scenario ${name} failed`, detail: err.message });
    throw err;
  });
}
