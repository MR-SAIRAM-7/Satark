import { formatInr, SCAM_TYPES, type LangCode } from '@satark/shared';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { sha256 } from '@/services/hash';
import type { Complaint } from '@/types';

import { buildScript, buildZeroFirLetter, dateTime } from './content';

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const block = (text: string) => `<pre>${esc(text)}</pre>`;

export interface KitPerson {
  name: string;
  locality: string;
  lang: LangCode;
}

/**
 * Complaint Kit as HTML. Rendered to PDF by the system WebView, whose text
 * shaping handles Telugu and Devanagari conjuncts correctly (many PDF
 * libraries break them). The backend uses the same template with Puppeteer.
 */
export function kitHtml(complaint: Complaint, person: KitPerson): string {
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
    body { font-family: 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', sans-serif; color: #0D1728; font-size: 11pt; line-height: 1.5; }
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
    <p class="muted">Each item's SHA-256 hash was computed on the phone when it was captured. Any later change to the content changes the hash.</p>
    <table><tr><th>#</th><th>Item</th><th>Content</th><th>SHA-256</th></tr>${rows}</table>

    <h2>4. 1930 script card</h2>
    <div class="box"><ol>${script}</ol></div>

    <div class="page"></div>
    <h2>5. Zero FIR request letter (BNSS Section 173)</h2>
    ${block(buildZeroFirLetter(complaint, person.name, person.locality))}

    <p class="meta" style="margin-top:28px">Prepared by Satark. Satark does not file complaints on your behalf: submit this on cybercrime.gov.in with your own OTP, or call 1930.</p>
  </body></html>`;
}

export interface RenderedKit {
  uri: string | null;
  sha256: string;
}

/** Render the kit to a PDF file and hash it, so the PDF itself is tamper-evident. */
export async function renderKit(complaint: Complaint, person: KitPerson): Promise<RenderedKit> {
  const html = kitHtml(complaint, person);
  if (Platform.OS === 'web') return { uri: null, sha256: await sha256(html) };
  const file = await Print.printToFileAsync({ html, base64: true });
  return { uri: file.uri, sha256: await sha256(file.base64 ?? html) };
}

/** Open the PDF: system share sheet on the phone, print dialog on the web. */
export async function openKit(complaint: Complaint, person: KitPerson): Promise<void> {
  if (Platform.OS === 'web' || !complaint.pdfUri) {
    await Print.printAsync({ html: kitHtml(complaint, person) });
    return;
  }
  await Sharing.shareAsync(complaint.pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Satark Complaint Kit',
    UTI: 'com.adobe.pdf',
  });
}
