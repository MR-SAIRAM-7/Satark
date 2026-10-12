/**
 * PII masking. Runs on the phone before any text is uploaded, so raw Aadhaar,
 * PAN, account, card and phone numbers never leave the device.
 */

const RULES: { re: RegExp; replace: (match: string) => string }[] = [
  // OTP codes next to the word OTP / code / password.
  {
    re: /\b(\d{4,8})(?=\s+is\s+(?:your\s+|the\s+)?(?:otp|one[- ]time|verification|code))/gi,
    replace: () => '[OTP]',
  },
  {
    re: /((?:otp|one[- ]time password|verification code|code)\s*(?:is|:|-)?\s*)(\d{4,8})\b/gi,
    replace: (m) => m.replace(/\d{4,8}$/, '[OTP]'),
  },
  // Card numbers: 16 digits, optionally grouped.
  { re: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replace: (m) => `XXXX XXXX XXXX ${m.replace(/\D/g, '').slice(-4)}` },
  // Aadhaar: 12 digits in 4-4-4, first digit 2-9.
  { re: /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/g, replace: (m) => `XXXX XXXX ${m.replace(/\D/g, '').slice(-4)}` },
  // PAN: AAAAA9999A
  { re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, replace: (m) => `XXXXX${m.slice(5, 9)}X` },
  // Phone numbers, with or without +91.
  {
    re: /(?<![\dA-Za-z])(?:\+?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)/g,
    replace: (m) => {
      const d = m.replace(/\D/g, '').slice(-10);
      return `${m.trim().startsWith('+') ? '+91' : ''}${d.slice(0, 2)}XXXXXX${d.slice(-2)}`;
    },
  },
  // Bank account numbers: long digit runs.
  { re: /(?<![\dA-Za-z])\d{9,18}(?!\d)/g, replace: (m) => `XXXX${m.slice(-4)}` },
  // Email addresses.
  { re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replace: () => '[EMAIL]' },
];

export function mask(text: string): string {
  return RULES.reduce((acc, rule) => acc.replace(rule.re, rule.replace), text);
}
