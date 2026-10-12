/**
 * "Call back the real one" (F17): official numbers to dial instead of whoever
 * just called.
 *
 * `verified: true` is set only where the number was confirmed against the
 * organisation's own published contact page while building this list (12 Oct
 * 2026): the 1930 helpline and the two SBI lines. Every other entry is a
 * widely published number that the team must confirm on the linked official
 * page before it is shown as verified; until then the app shows "confirm on
 * the official site" with that link instead of a badge. A wrong number in a
 * scam-protection app is worse than none.
 */
export interface DirectoryEntry {
  id: string;
  /** Matches `brands[].id` in @satark/shared rules.json, when there is one. */
  brandId?: string;
  name: string;
  purpose: string;
  number: string;
  kind: 'emergency' | 'bank' | 'government' | 'utility';
  verified: boolean;
  website: string;
}

export const DIRECTORY: DirectoryEntry[] = [
  { id: 'cyber-1930', brandId: 'cybercrime', name: 'Cyber Crime Helpline', purpose: 'Report online financial fraud, 24x7', number: '1930', kind: 'emergency', verified: true, website: 'https://cybercrime.gov.in' },
  { id: 'emergency-112', name: 'Emergency (Police)', purpose: 'All-India emergency number', number: '112', kind: 'emergency', verified: false, website: 'https://112.gov.in' },
  { id: 'elderline', name: 'Elder Line', purpose: 'National helpline for senior citizens', number: '14567', kind: 'emergency', verified: false, website: 'https://socialjustice.gov.in' },

  { id: 'sbi', brandId: 'sbi', name: 'State Bank of India', purpose: 'Contact centre', number: '1800 1234', kind: 'bank', verified: true, website: 'https://sbi.co.in/web/customer-care/contact-us' },
  { id: 'sbi-fraud', brandId: 'sbi', name: 'SBI - unauthorised transaction', purpose: 'Report a transaction you did not make', number: '1800 11 1109', kind: 'bank', verified: true, website: 'https://sbi.co.in/web/customer-care/contact-us' },
  { id: 'hdfc', brandId: 'hdfc', name: 'HDFC Bank', purpose: 'PhoneBanking', number: '1800 1600', kind: 'bank', verified: false, website: 'https://www.hdfcbank.com/personal/need-help/contact-us' },
  { id: 'icici', brandId: 'icici', name: 'ICICI Bank', purpose: 'Customer care', number: '1800 1080', kind: 'bank', verified: false, website: 'https://www.icicibank.com/contact-us' },
  { id: 'axis', brandId: 'axis', name: 'Axis Bank', purpose: 'Customer care', number: '1800 209 5577', kind: 'bank', verified: false, website: 'https://www.axisbank.com/support' },
  { id: 'pnb', brandId: 'pnb', name: 'Punjab National Bank', purpose: 'Customer care', number: '1800 1800', kind: 'bank', verified: false, website: 'https://www.pnbindia.in/contact-us.html' },
  { id: 'bob', brandId: 'bob', name: 'Bank of Baroda', purpose: 'Contact centre', number: '1800 5700', kind: 'bank', verified: false, website: 'https://www.bankofbaroda.in/contact-us' },
  { id: 'canara', brandId: 'canara', name: 'Canara Bank', purpose: 'Customer care', number: '1800 1030', kind: 'bank', verified: false, website: 'https://canarabank.com/pages/contact-us' },
  { id: 'union', brandId: 'union', name: 'Union Bank of India', purpose: 'Customer care', number: '1800 2222 44', kind: 'bank', verified: false, website: 'https://www.unionbankofindia.co.in/english/contact-us.aspx' },

  { id: 'uidai', brandId: 'uidai', name: 'UIDAI (Aadhaar)', purpose: 'Aadhaar helpline', number: '1947', kind: 'government', verified: false, website: 'https://uidai.gov.in/contact-support.html' },
  { id: 'incometax', brandId: 'incometax', name: 'Income Tax e-Filing', purpose: 'e-Filing helpdesk', number: '1800 103 0025', kind: 'government', verified: false, website: 'https://www.incometax.gov.in/iec/foportal/contact-us' },
  { id: 'indiapost', brandId: 'indiapost', name: 'India Post', purpose: 'Customer care', number: '1800 266 6868', kind: 'government', verified: false, website: 'https://www.indiapost.gov.in' },
  { id: 'npci', brandId: 'npci', name: 'NPCI (UPI)', purpose: 'UPI helpline', number: '1800 120 1740', kind: 'government', verified: false, website: 'https://www.npci.org.in' },
  { id: 'rbi', brandId: 'rbi', name: 'Reserve Bank of India', purpose: 'RBI contact centre', number: '14448', kind: 'government', verified: false, website: 'https://cms.rbi.org.in' },

  { id: 'electricity', brandId: 'tgspdcl', name: 'Electricity (TGSPDCL)', purpose: 'Power supply complaints', number: '1912', kind: 'utility', verified: false, website: 'https://tgsouthernpower.org' },
];

/** The official number for a brand named in a scam message, if Satark knows one. */
export function entryForBrand(brandId: string | undefined): DirectoryEntry | undefined {
  return brandId ? DIRECTORY.find((e) => e.brandId === brandId) : undefined;
}

export const HELPLINE_1930 = DIRECTORY[0]!;
export const CYBERCRIME_PORTAL = 'https://cybercrime.gov.in';
