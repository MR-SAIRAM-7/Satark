/**
 * Bank transaction SMS parser (F11). A debit within 60 minutes of a high-risk
 * event triggers the golden-hour flow, so amount, bank and UTR must be exact.
 */
import rules from './rules.json';

export interface ParsedTxn {
  type: 'debit' | 'credit';
  amount: number;
  bank?: string;
  /** Last digits of the account or card. */
  accountTail?: string;
  /** UTR / UPI reference / RRN: what the bank needs to trace and freeze the money. */
  reference?: string;
  payee?: string;
  /** UPI ID the money went to, if the SMS includes it. */
  payeeVpa?: string;
}

/** Golden-hour window after a high-risk event, in minutes. */
export const TXN_ALERT_WINDOW_MIN = 60;

const AMOUNT_RE = /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_AFTER_RE = /(?:debited|credited|spent|paid|sent|withdrawn)\s+(?:by|for|with|of)?\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const DEBIT_RE = /\b(debited|debit|spent|withdrawn|paid|sent|transferred|purchase|dr\.?)\b/i;
const CREDIT_RE = /\b(credited|credit|received|deposited|refunded|cr\.?)\b/i;
const REF_RE =
  /(?:utr|rrn|upi\s*ref(?:erence)?(?:\s*no\.?)?|ref(?:erence)?\s*(?:no\.?|number|id)?|refno|txn\s*(?:id|no\.?)|transaction\s*id)\s*[:.\-#]?\s*([a-z0-9]{8,22})/i;
const ACCOUNT_RE = /(?:a\/c|ac|acct|account|card)(?:\s*(?:no\.?|number|ending|ending with))?\s*[:.]?\s*[x*]*\s*(\d{3,6})\b/i;
const VPA_RE = /([a-z0-9][a-z0-9._-]{1,48}@[a-z][a-z0-9]{1,20})(?!\w|\.\w)/i;
const PAYEE_RE = /(?:trf to|transfer to|paid to|sent to|to)\s+([A-Za-z][A-Za-z0-9 .&'-]{2,40}?)(?=\s+(?:on|ref|refno|upi|utr|via|at|avl|bal)\b|[.,;]|$)/i;

const BANK_BRANDS = rules.brands.filter((b) => b.kind === 'bank');

function bankFrom(text: string, sender?: string | null): string | undefined {
  const haystack = `${sender ?? ''} ${text}`.toLowerCase();
  return BANK_BRANDS.find((b) => b.keys.some((k) => haystack.includes(k)) || b.names.some((n) => haystack.includes(n)))
    ?.name;
}

/** Parse a bank SMS. Returns null for anything that is not a real debit or credit alert. */
export function parseTxnSms(text: string, sender?: string | null): ParsedTxn | null {
  const debit = DEBIT_RE.test(text);
  const credit = CREDIT_RE.test(text);
  if (!debit && !credit) return null;
  // "will be debited", "to avoid debit": warnings and offers, not transactions.
  if (/\b(will be|would be|to avoid|get|win|offer|eligible)\b[^.]{0,20}\b(debited|credited|cashback)\b/i.test(text)) {
    return null;
  }

  const amountMatch = AMOUNT_RE.exec(text) ?? AMOUNT_AFTER_RE.exec(text);
  const amount = amountMatch ? Number(amountMatch[1]!.replace(/,/g, '')) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const debitIndex = text.search(DEBIT_RE);
  const creditIndex = text.search(CREDIT_RE);
  const type: ParsedTxn['type'] =
    debit && (!credit || debitIndex < creditIndex) ? 'debit' : 'credit';

  return {
    type,
    amount,
    bank: bankFrom(text, sender),
    accountTail: ACCOUNT_RE.exec(text)?.[1],
    reference: REF_RE.exec(text)?.[1]?.toUpperCase(),
    payeeVpa: VPA_RE.exec(text)?.[1]?.toLowerCase(),
    payee: PAYEE_RE.exec(text)?.[1]?.trim(),
  };
}

/** ₹1,24,000 - Indian digit grouping. */
export function formatInr(amount: number): string {
  const [whole = '0', fraction] = amount.toFixed(2).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `₹${grouped}${fraction && fraction !== '00' ? `.${fraction}` : ''}`;
}
