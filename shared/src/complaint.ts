/**
 * Complaint Kit content (F12), shared by the phone (expo-print) and the backend
 * (headless Chromium), so the PDF a victim builds offline and the one the
 * server sends on WhatsApp say exactly the same thing.
 *
 * Everything here is a pure function of the complaint data.
 */
import { SCAM_TYPES } from './explanations';
import { uiLangFor, type LangCode, type UiLang } from './languages';
import { formatInr, type ParsedTxn } from './txn';
import type { ScamType } from './types';

/** The order a cyber-fraud complaint moves through. Drives the tracker and WhatsApp updates. */
export const FIR_STAGES = [
  'kit_ready',
  'helpline_1930',
  'portal_filed',
  'acknowledged',
  'bank_hold',
  'zero_fir',
  'io_assigned',
] as const;

export type FirStageId = (typeof FIR_STAGES)[number];

export interface KitEvidence {
  kind: 'message' | 'transaction' | 'call' | 'transcript';
  label: string;
  content: string;
  at: number;
  sha256: string;
}

export interface KitSuspect {
  phones: string[];
  upiIds: string[];
  links: string[];
}

/** The fields of a complaint the kit is built from. The phone and server records both satisfy it. */
export interface KitComplaint {
  id: string;
  createdAt: number;
  scamType: ScamType;
  narrative: string;
  summary: string;
  suspect: KitSuspect;
  transaction: (ParsedTxn & { at: number }) | null;
  evidence: KitEvidence[];
  ackNumber: string | null;
}

export interface KitPerson {
  name: string;
  locality: string;
  lang: LangCode;
}

export const dateTime = (at: number) =>
  new Date(at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export interface NarrativeInput {
  name: string;
  locality: string;
  complaint: Pick<KitComplaint, 'scamType' | 'suspect' | 'transaction' | 'evidence' | 'createdAt'>;
  channel: string;
  firstAt: number;
}

/** Complaint text in English, following the cybercrime.gov.in sections. */
export function buildNarrative({ name, locality, complaint, channel, firstAt }: NarrativeInput): string {
  const { suspect, transaction, evidence, scamType } = complaint;
  const who = name || 'the complainant';
  const list = (items: string[]) => (items.length ? items.join(', ') : 'Not known');
  const messages = evidence.filter((e) => e.kind !== 'transaction');

  return [
    'INCIDENT DETAILS',
    `Category: Online Financial Fraud - ${SCAM_TYPES[scamType].label.en}`,
    `Date and time of incident: ${dateTime(firstAt)}`,
    `Place: ${locality}`,
    `I, ${who}, was contacted over ${channel} by an unknown person. ${SCAM_TYPES[scamType].explanation.en}`,
    '',
    'SEQUENCE OF EVENTS',
    ...messages.map((e, i) => `${i + 1}. [${dateTime(e.at)}] ${e.label}: "${e.content.replace(/\s+/g, ' ').slice(0, 400)}"`),
    '',
    'SUSPECT DETAILS',
    `Phone numbers: ${list(suspect.phones)}`,
    `UPI IDs: ${list(suspect.upiIds)}`,
    `Websites / links: ${list(suspect.links)}`,
    '',
    'TRANSACTION DETAILS',
    ...(transaction
      ? [
          `Amount: ${formatInr(transaction.amount)}`,
          `Bank: ${transaction.bank ?? 'Not known'}${transaction.accountTail ? ` (A/c ending ${transaction.accountTail})` : ''}`,
          `Date and time: ${dateTime(transaction.at)}`,
          `UTR / reference number: ${transaction.reference ?? 'Not known'}`,
          `Beneficiary: ${transaction.payee ?? transaction.payeeVpa ?? 'Not known'}`,
        ]
      : ['No money was transferred. This complaint is to report the attempt and the suspect identifiers.']),
    '',
    'EVIDENCE',
    `${evidence.length} item(s) attached. Each carries a SHA-256 hash recorded at the time of capture.`,
    '',
    'REQUEST',
    transaction
      ? 'I request that the beneficiary account be frozen and the amount placed on hold immediately, and that an FIR be registered against the unknown accused.'
      : 'I request that the suspect numbers, UPI IDs and links be blocked and that an FIR be registered against the unknown accused.',
  ].join('\n');
}

const SUMMARY: Record<UiLang, (type: string, amount: string | null) => string> = {
  en: (type, amount) =>
    `Someone tried a "${type}" on you. ${amount ? `${amount} left your account.` : 'No money was lost.'} This kit has everything the police and your bank need. Call 1930 first.`,
  hi: (type, amount) =>
    `किसी ने आपके साथ "${type}" की कोशिश की। ${amount ? `आपके खाते से ${amount} निकले हैं।` : 'कोई पैसा नहीं गया।'} इस किट में वह सब कुछ है जो पुलिस और आपके बैंक को चाहिए। सबसे पहले 1930 पर कॉल करें।`,
  te: (type, amount) =>
    `ఎవరో మీపై "${type}" ప్రయత్నించారు. ${amount ? `మీ ఖాతా నుండి ${amount} పోయింది.` : 'డబ్బు ఏమీ పోలేదు.'} పోలీసులకు, మీ బ్యాంక్‌కు కావలసినవన్నీ ఈ కిట్‌లో ఉన్నాయి. ముందుగా 1930కి కాల్ చేయండి.`,
};

/** Plain-language summary for the elder, in their language. */
export function buildSummary(complaint: Pick<KitComplaint, 'scamType' | 'transaction'>, lang: LangCode): string {
  const ui = uiLangFor(lang);
  const amount = complaint.transaction ? formatInr(complaint.transaction.amount) : null;
  return SUMMARY[ui](SCAM_TYPES[complaint.scamType].label[ui], amount);
}

/** 1930 script card: what to say, in order. Read aloud in the elder's language. */
export function buildScript(complaint: Pick<KitComplaint, 'transaction' | 'suspect'>, lang: LangCode): string[] {
  const t = complaint.transaction;
  const amount = t ? formatInr(t.amount) : null;
  const suspect = complaint.suspect.upiIds[0] ?? complaint.suspect.phones[0] ?? null;
  const lines: Record<UiLang, (string | null)[]> = {
    en: [
      'Say: "I want to report an online financial fraud."',
      amount ? `Amount lost: ${amount}.` : 'Say that no money was lost, but you want the number reported.',
      t ? `Date and time: ${dateTime(t.at)}.` : null,
      t?.reference ? `Transaction reference (UTR): ${t.reference}.` : null,
      t?.bank ? `My bank: ${t.bank}${t.accountTail ? `, account ending ${t.accountTail}` : ''}.` : null,
      suspect ? `The fraudster's details: ${suspect}.` : null,
      'Ask for the acknowledgement number and write it down.',
    ],
    hi: [
      'कहें: "मुझे ऑनलाइन वित्तीय धोखाधड़ी की रिपोर्ट करनी है।"',
      amount ? `गई हुई रकम: ${amount}।` : 'बताएं कि पैसे नहीं गए, लेकिन आप नंबर की रिपोर्ट करना चाहते हैं।',
      t ? `तारीख और समय: ${dateTime(t.at)}।` : null,
      t?.reference ? `लेन-देन का रेफ़रेंस (UTR): ${t.reference}।` : null,
      t?.bank ? `मेरा बैंक: ${t.bank}${t.accountTail ? `, खाता जिसके अंत में ${t.accountTail} है` : ''}।` : null,
      suspect ? `ठग का विवरण: ${suspect}।` : null,
      'पावती संख्या माँगें और उसे लिख लें।',
    ],
    te: [
      'ఇలా చెప్పండి: "నేను ఆన్‌లైన్ ఆర్థిక మోసాన్ని రిపోర్ట్ చేయాలనుకుంటున్నాను."',
      amount ? `పోయిన మొత్తం: ${amount}.` : 'డబ్బు పోలేదని, కానీ నంబర్‌ను రిపోర్ట్ చేయాలనుకుంటున్నానని చెప్పండి.',
      t ? `తేదీ, సమయం: ${dateTime(t.at)}.` : null,
      t?.reference ? `లావాదేవీ రిఫరెన్స్ (UTR): ${t.reference}.` : null,
      t?.bank ? `నా బ్యాంక్: ${t.bank}${t.accountTail ? `, ${t.accountTail}తో ముగిసే ఖాతా` : ''}.` : null,
      suspect ? `మోసగాడి వివరాలు: ${suspect}.` : null,
      'అక్నాలెడ్జ్‌మెంట్ నంబర్ అడిగి, రాసుకోండి.',
    ],
  };
  return lines[uiLangFor(lang)].filter((l): l is string => l !== null);
}

/** Zero FIR request letter under BNSS Section 173, to hand in at any police station. */
export function buildZeroFirLetter(
  complaint: Pick<KitComplaint, 'transaction' | 'createdAt' | 'scamType' | 'ackNumber' | 'evidence'>,
  name: string,
  locality: string,
): string {
  const t = complaint.transaction;
  return [
    'To,',
    'The Station House Officer,',
    '______________________ Police Station.',
    '',
    `Date: ${new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    '',
    'Subject: Request to register a Zero FIR under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023 - cyber financial fraud.',
    '',
    'Respected Sir / Madam,',
    '',
    `I, ${name || '______________'}, resident of ${locality}, am a victim of a cyber fraud (${SCAM_TYPES[complaint.scamType].label.en}).` +
      (t
        ? ` An amount of ${formatInr(t.amount)} was debited from my ${t.bank ?? 'bank'} account on ${dateTime(t.at)}` +
          `${t.reference ? ` (UTR / reference ${t.reference})` : ''}.`
        : ' The accused attempted to cheat me; the details and identifiers are enclosed.'),
    '',
    'As the offence is cognizable, I request you to register a Zero FIR irrespective of territorial jurisdiction and transfer it to the competent police station, and to take immediate steps to freeze the beneficiary account.',
    '',
    `Cybercrime portal / 1930 acknowledgement number: ${complaint.ackNumber ?? '______________'}`,
    `Enclosures: Satark Complaint Kit with ${complaint.evidence.length} evidence item(s), each with its SHA-256 hash.`,
    '',
    'Yours faithfully,',
    '',
    name || '______________',
    'Signature: ______________      Mobile: ______________',
  ].join('\n');
}

export interface WhatsAppContext {
  name: string;
  ref: string;
  amount: string | null;
  ack: string | null;
  fir: string | null;
}

/** WhatsApp status updates, sent through Twilio as each stage is reached. */
export const STAGE_MESSAGE: Record<FirStageId, (c: WhatsAppContext) => string> = {
  kit_ready: (c) =>
    `Satark: Complaint kit ${c.ref} is ready for ${c.name}.${c.amount ? ` Amount: ${c.amount}.` : ''} Call 1930 now and keep this PDF open.`,
  helpline_1930: (c) =>
    `Satark update (${c.ref}): Reported to the 1930 cyber helpline. Ask for the acknowledgement number and save it in the app.`,
  portal_filed: (c) => `Satark update (${c.ref}): Complaint filed on the National Cyber Crime Reporting Portal.`,
  acknowledged: (c) =>
    `Satark update (${c.ref}): Acknowledgement number ${c.ack ?? 'saved'}. Keep it safe; the bank and police will ask for it.`,
  bank_hold: (c) =>
    `Satark update (${c.ref}): Your bank has been asked to hold ${c.amount ?? 'the amount'}. Reporting inside the golden hour gives the best chance of recovery.`,
  zero_fir: (c) =>
    `Satark update (${c.ref}): FIR registered${c.fir ? `, number ${c.fir}` : ''}. Carry the Zero FIR letter and the evidence PDF to the police station.`,
  io_assigned: (c) =>
    `Satark update (${c.ref}): An investigating officer has been assigned. Do not share OTPs with anyone claiming to "recover" your money.`,
};

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const block = (text: string) => `<pre>${esc(text)}</pre>`;

/**
 * Complaint Kit as HTML. Rendered to PDF by a browser engine (the phone's
 * WebView, or headless Chromium on the server), whose text shaping handles
 * Telugu and Devanagari conjuncts correctly; many PDF libraries break them.
 */
export function kitHtml(complaint: KitComplaint, person: KitPerson): string {
  const t = complaint.transaction;
  const rows = complaint.evidence
    .map(
      (e, i) => `<tr><td>${i + 1}</td><td><b>${esc(e.label)}</b><br><span class="muted">${esc(dateTime(e.at))}</span></td>
      <td>${esc(e.content.slice(0, 600))}</td><td class="hash">${e.sha256}</td></tr>`,
    )
    .join('');
  const script = buildScript(complaint, person.lang).map((line) => `<li>${esc(line)}</li>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 18mm 15mm; }
    body { font-family: 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif; color: #0D1728; font-size: 11pt; line-height: 1.5; }
    h1 { color: #143A6E; font-size: 20pt; margin: 0; }
    h2 { color: #143A6E; font-size: 13pt; border-bottom: 2px solid #DCE3EE; padding-bottom: 4px; margin-top: 22px; }
    .meta { color: #4D5A72; font-size: 10pt; }
    .box { background: #F3F6FB; border-left: 4px solid #1F6FEB; padding: 10px 12px; margin: 10px 0; }
    .danger { border-left-color: #CC1F1F; background: #FDE8E8; }
    pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th, td { border: 1px solid #DCE3EE; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #EAF0F8; }
    .hash { font-family: monospace; font-size: 7.5pt; word-break: break-all; width: 26%; }
    .muted { color: #4D5A72; }
    .page { page-break-before: always; }
    ol { padding-left: 18px; }
  </style></head><body>
    <h1>Satark Complaint Kit</h1>
    <div class="meta">Reference ${esc(complaint.id.toUpperCase())} · Generated ${esc(dateTime(complaint.createdAt))} · ${esc(SCAM_TYPES[complaint.scamType].label.en)}</div>

    <div class="box danger"><b>${esc(complaint.summary)}</b></div>

    <h2>1. Complaint (for cybercrime.gov.in and 1930)</h2>
    ${block(complaint.narrative)}

    <h2>2. Transaction</h2>
    ${
      t
        ? `<table><tr><th>Amount</th><th>Bank</th><th>Date and time</th><th>UTR / reference</th><th>Beneficiary</th></tr>
           <tr><td>${esc(formatInr(t.amount))}</td><td>${esc(t.bank ?? '-')}</td><td>${esc(dateTime(t.at))}</td>
           <td>${esc(t.reference ?? '-')}</td><td>${esc(t.payee ?? t.payeeVpa ?? '-')}</td></tr></table>`
        : '<p class="muted">No money was transferred.</p>'
    }

    <h2>3. Evidence annex</h2>
    <p class="muted">Each item's SHA-256 hash was computed when it was captured. Any later change to the content changes the hash.</p>
    <table><tr><th>#</th><th>Item</th><th>Content</th><th>SHA-256</th></tr>${rows}</table>

    <h2>4. 1930 script card</h2>
    <div class="box"><ol>${script}</ol></div>

    <div class="page"></div>
    <h2>5. Zero FIR request letter (BNSS Section 173)</h2>
    ${block(buildZeroFirLetter(complaint, person.name, person.locality))}

    <p class="meta" style="margin-top:28px">Prepared by Satark. Satark does not file complaints on your behalf: submit this on cybercrime.gov.in with your own OTP, or call 1930.</p>
  </body></html>`;
}
