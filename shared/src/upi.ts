/** UPI checker (rules R7, R8): VPAs in text, upi:// links and QR payloads. */

export interface UpiFinding {
  vpa: string;
  /** PSP handle after the @, e.g. "ybl", "okaxis". */
  handle: string;
  payeeName?: string;
  amount?: number;
  note?: string;
  /** The local part is a phone number: a personal account, not a registered biller. */
  personal: boolean;
}

const VPA_RE = /(?<![\w.])([a-z0-9][a-z0-9._-]{1,48})@([a-z][a-z0-9]{1,20})(?![\w.])/gi;
const UPI_URI_RE = /upi:\/\/pay\?[^\s<>"']+/gi;

function toFinding(vpa: string, extra: Partial<UpiFinding> = {}): UpiFinding {
  const [local = '', handle = ''] = vpa.toLowerCase().split('@');
  return { vpa: vpa.toLowerCase(), handle, personal: /^\d{10}$/.test(local), ...extra };
}

/** Parse a upi://pay?pa=...&pn=...&am=... link or QR payload. */
export function parseUpiUri(uri: string): UpiFinding | null {
  const query = uri.split('?')[1];
  if (!/^upi:\/\/pay/i.test(uri) || !query) return null;
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (!key) continue;
    try {
      params[key.toLowerCase()] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      params[key.toLowerCase()] = value;
    }
  }
  if (!params.pa) return null;
  const amount = Number(params.am);
  return toFinding(params.pa, {
    payeeName: params.pn || undefined,
    amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    note: params.tn || undefined,
  });
}

export function extractUpi(text: string): UpiFinding[] {
  const found = new Map<string, UpiFinding>();
  for (const m of text.matchAll(UPI_URI_RE)) {
    const parsed = parseUpiUri(m[0]);
    if (parsed) found.set(parsed.vpa, parsed);
  }
  for (const m of text.matchAll(VPA_RE)) {
    const vpa = m[0].toLowerCase();
    if (!found.has(vpa)) found.set(vpa, toFinding(vpa));
  }
  return [...found.values()];
}
