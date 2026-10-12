/**
 * Sender intelligence for India: TRAI SMS headers, 1600-series bank calls,
 * mobile and international numbers.
 */

export type SenderKind = 'header' | 'mobile' | 'international' | 'service' | 'contact' | 'unknown';

/** TRAI suffix, mandatory on commercial SMS since 6 May 2025. */
export type HeaderSuffix = 'P' | 'S' | 'T' | 'G';

export interface SenderInfo {
  raw: string;
  kind: SenderKind;
  /** Registered header without operator prefix or suffix, e.g. "SBIINB". */
  header?: string;
  suffix?: HeaderSuffix;
  /** Digits in E.164 form when the sender is a phone number. */
  e164?: string;
  /** 1600xx: the series RBI and TRAI reserve for banking and finance service calls. */
  is1600: boolean;
  /** 140xx: promotional/telemarketing series. */
  is140: boolean;
}

// "VM-SBIINB-S" (operator prefix + header + suffix) or a bare all-caps header "HDFCBK".
const PREFIXED_HEADER_RE = /^[A-Za-z]{2}-([A-Za-z0-9]{3,9})(?:-([PSTGpstg]))?$/;
const BARE_HEADER_RE = /^([A-Z0-9]{5,9})(?:-([PSTG]))?$/;

export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/** Normalise an Indian mobile number to +91XXXXXXXXXX, or return null. */
export function normalizeIndianMobile(value: string): string | null {
  let d = digitsOf(value);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 && /^[6-9]/.test(d) ? `+91${d}` : null;
}

export function parseSender(raw: string | null | undefined): SenderInfo {
  const value = (raw ?? '').trim();
  const base = { raw: value, is1600: false, is140: false };
  if (!value) return { ...base, kind: 'unknown' };

  const compact = value.replace(/\s+/g, '');
  const header = PREFIXED_HEADER_RE.exec(compact) ?? BARE_HEADER_RE.exec(compact);
  if (header && /[A-Za-z]/.test(header[1] ?? '')) {
    return {
      ...base,
      kind: 'header',
      header: header[1]?.toUpperCase(),
      suffix: header[2]?.toUpperCase() as HeaderSuffix | undefined,
    };
  }

  const looksNumeric = /^[+\d][\d\s\-()]{3,}$/.test(value);
  if (!looksNumeric) return { ...base, kind: 'contact' };

  const digits = digitsOf(value);
  const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (/^1600\d{4,8}$/.test(national)) return { ...base, kind: 'service', is1600: true, e164: `+91${national}` };
  if (/^140\d{4,8}$/.test(national)) return { ...base, kind: 'service', is140: true, e164: `+91${national}` };

  const mobile = normalizeIndianMobile(value);
  if (value.startsWith('+') && !value.replace(/\s/g, '').startsWith('+91')) {
    return { ...base, kind: 'international', e164: `+${digits}` };
  }
  if (mobile) return { ...base, kind: 'mobile', e164: mobile };
  if (digits.length <= 6) return { ...base, kind: 'service' };
  return { ...base, kind: 'unknown', e164: digits ? `+${digits}` : undefined };
}

/** "+91 98765 43210" -> "+91 98XXX XXX10". For display and logs. */
export function maskPhone(value: string): string {
  const d = digitsOf(value);
  if (d.length < 6) return value;
  const head = d.slice(0, d.length - 10 > 0 ? d.length - 8 : 2);
  const tail = d.slice(-2);
  const middle = 'X'.repeat(Math.max(d.length - head.length - tail.length, 0));
  return `${value.trim().startsWith('+') ? '+' : ''}${head}${middle}${tail}`;
}
