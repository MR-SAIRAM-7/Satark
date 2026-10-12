/**
 * Demo data. Every person, number, UPI ID and domain here is invented for the
 * demo; none comes from a real case. Message texts follow scam scripts that
 * I4C, PIB Fact Check and TGCSB have publicly warned about.
 */
import type { IndicatorType, ScamType } from '@satark/shared';

export const DEMO_POLICE = [
  { name: 'Inspector K. Rao', phone: '+919000000001', badge: 'TGCSB-1043', station: 'Cyber Crime PS, TGCSB Hyderabad' },
  { name: 'SI Fatima Begum', phone: '+919000000002', badge: 'TGCSB-2217', station: 'Cyber Crime PS, TGCSB Hyderabad' },
];

/** The demo storyline: Lakshmi (Ammamma) in Kukatpally and her son Ravi in Bengaluru. */
export const DEMO_ELDERS = [
  { name: 'Lakshmi Devi', phone: '+919000000101', locality: 'Kukatpally', lang: 'te', guardian: { name: 'Ravi Kumar', phone: '+919000000201', relation: 'son' } },
  { name: 'Venkata Rao', phone: '+919000000102', locality: 'Ameerpet', lang: 'te', guardian: { name: 'Priya Rao', phone: '+919000000202', relation: 'daughter' } },
  { name: 'Sarojini Naidu', phone: '+919000000103', locality: 'Secunderabad', lang: 'en', guardian: { name: 'Arjun Naidu', phone: '+919000000203', relation: 'son' } },
  { name: 'Ramaiah Goud', phone: '+919000000104', locality: 'Dilsukhnagar', lang: 'te', guardian: { name: 'Swathi Goud', phone: '+919000000204', relation: 'daughter' } },
  { name: 'Kamala Sharma', phone: '+919000000105', locality: 'Banjara Hills', lang: 'hi', guardian: { name: 'Rohit Sharma', phone: '+919000000205', relation: 'son' } },
  { name: 'Prabhakar Reddy', phone: '+919000000106', locality: 'Uppal', lang: 'te', guardian: null },
  { name: 'Shanta Iyer', phone: '+919000000107', locality: 'Malkajgiri', lang: 'en', guardian: { name: 'Meera Iyer', phone: '+919000000207', relation: 'daughter' } },
  { name: 'Mohammed Yusuf', phone: '+919000000108', locality: 'Charminar', lang: 'hi', guardian: { name: 'Arif Yusuf', phone: '+919000000208', relation: 'son' } },
  { name: 'Annapurna Devi', phone: '+919000000109', locality: 'Tarnaka', lang: 'te', guardian: null },
  { name: 'Narayana Murthy', phone: '+919000000110', locality: 'Madhapur', lang: 'en', guardian: { name: 'Kiran Murthy', phone: '+919000000210', relation: 'son' } },
];

/** Same values as the phone's demo blocklist (mobile/src/features/demo/seed.ts), so the hashes match. */
export const COMMUNITY_SEED: { type: IndicatorType; value: string; reports: number; scamType: ScamType; hoursAgo: number }[] = [
  { type: 'phone', value: '+919000054321', reports: 37, scamType: 'digital_arrest', hoursAgo: 5 },
  { type: 'phone', value: '+919700011223', reports: 12, scamType: 'malware_apk', hoursAgo: 20 },
  { type: 'phone', value: '+919640055667', reports: 8, scamType: 'investment', hoursAgo: 30 },
  { type: 'upi', value: 'arjun.trader88@ybl', reports: 8, scamType: 'investment', hoursAgo: 30 },
  { type: 'upi', value: 'electricity.officer21@okaxis', reports: 19, scamType: 'electricity', hoursAgo: 2 },
  { type: 'domain', value: 'sbi-yono-kyc.xyz', reports: 24, scamType: 'kyc_bank', hoursAgo: 9 },
  { type: 'domain', value: 'hdfcbnak-rewards.top', reports: 6, scamType: 'phishing_link', hoursAgo: 48 },
  { type: 'domain', value: 'indiapost-redelivery.live', reports: 15, scamType: 'courier', hoursAgo: 14 },
  // Server-only extras for the dashboard.
  { type: 'phone', value: '+919848012345', reports: 9, scamType: 'digital_arrest', hoursAgo: 1 },
  { type: 'phone', value: '+918885512345', reports: 5, scamType: 'kyc_bank', hoursAgo: 11 },
  { type: 'phone', value: '+917702233445', reports: 4, scamType: 'job_task', hoursAgo: 26 },
  { type: 'phone', value: '+919346677889', reports: 3, scamType: 'electricity', hoursAgo: 7 },
  { type: 'phone', value: '+923001234567', reports: 6, scamType: 'family_emergency', hoursAgo: 15 },
  { type: 'phone', value: '+916300112233', reports: 2, scamType: 'lottery', hoursAgo: 40 },
  { type: 'upi', value: 'rbi.verify@ybl', reports: 14, scamType: 'digital_arrest', hoursAgo: 3 },
  { type: 'upi', value: 'customs.clear9@oksbi', reports: 7, scamType: 'courier', hoursAgo: 18 },
  { type: 'upi', value: 'hr.taskpay@ybl', reports: 5, scamType: 'job_task', hoursAgo: 22 },
  { type: 'upi', value: 'kbc.lottery@axl', reports: 2, scamType: 'lottery', hoursAgo: 60 },
  { type: 'upi', value: 'stockguru777@ibl', reports: 11, scamType: 'investment', hoursAgo: 6 },
  { type: 'domain', value: 'icici-kyc-update.online', reports: 9, scamType: 'kyc_bank', hoursAgo: 12 },
  { type: 'domain', value: 'tgspdcl-billpay.site', reports: 13, scamType: 'electricity', hoursAgo: 4 },
  { type: 'domain', value: 'incometax-refund.co', reports: 4, scamType: 'phishing_link', hoursAgo: 30 },
  { type: 'domain', value: 'pmkisan-update.info', reports: 2, scamType: 'phishing_link', hoursAgo: 70 },
];

/** Relative frequency of each scam type in the demo history (investment and digital arrest lead, as in Hyderabad). */
export const TYPE_WEIGHTS: [ScamType, number][] = [
  ['investment', 22],
  ['digital_arrest', 18],
  ['kyc_bank', 14],
  ['electricity', 9],
  ['courier', 8],
  ['malware_apk', 7],
  ['job_task', 6],
  ['upi_collect', 5],
  ['family_emergency', 4],
  ['phishing_link', 3],
  ['lottery', 2],
  ['remote_access', 1],
  ['sim_block', 1],
];

/** Messages as the server stores them: already masked. */
export const MESSAGES: Record<string, { source: 'sms' | 'whatsapp' | 'call'; sender: string; text: string }[]> = {
  digital_arrest: [
    { source: 'whatsapp', sender: '+91 98480 12345', text: 'This is Sub-Inspector Vikram Rathod, Mumbai Police Cyber Crime Branch. Your Aadhaar number is linked to a money laundering case. An arrest warrant has been issued in your name. Do not tell anyone. Join the video call now.' },
    { source: 'whatsapp', sender: '+91 90000 54321', text: 'CBI notice: case no CBI/ML/889/2026 registered against you. To avoid arrest transfer the amount to RBI verification account rbi.verify@ybl for safe keeping. Keep this confidential.' },
    { source: 'call', sender: '+91 90000 54321', text: 'Madam you are under digital arrest by Narcotics Control Bureau. A parcel in your name has MDMA. Do not disconnect the call and do not inform your family.' },
  ],
  kyc_bank: [
    { source: 'sms', sender: '98XXXXXX70', text: 'Dear customer your SBI YONO account will be blocked today. Please update your PAN card immediately click here http://sbi-yono-kyc.xyz/update' },
    { source: 'sms', sender: '88XXXXXX45', text: 'ICICI Bank: your netbanking is suspended due to incomplete KYC. Update now at https://icici-kyc-update.online within 2 hours.' },
    { source: 'whatsapp', sender: '+91 88855 12345', text: 'Your debit card is blocked. Share the OTP you received to unblock it immediately or your account will be frozen.' },
  ],
  investment: [
    { source: 'whatsapp', sender: '+91 96400 55667', text: 'Namaste sir, mana VIP stock trading group lo join avvandi. Guaranteed returns 30% per week, risk free. Send money to UPI arjun.trader88@ybl and share screenshot.' },
    { source: 'whatsapp', sender: '+91 96400 55667', text: 'Professor Arjun insider tips: Tata Motors will double tomorrow. Pay membership to stockguru777@ibl and join premium group. Limited seats.' },
    { source: 'whatsapp', sender: '+44 7700 900123', text: 'IPO allotment guaranteed through our institutional account. Deposit Rs 1,00,000 today, withdraw profit anytime. SEBI registered.' },
  ],
  electricity: [
    { source: 'sms', sender: '93XXXXXX89', text: 'Dear Customer your electricity power will be disconnected tonight at 9.30 pm because previous month bill was not update. Contact electricity officer 93XXXXXX89 immediately.' },
    { source: 'sms', sender: '93XXXXXX89', text: 'TGSPDCL: Your power connection will be cut today. Pay pending bill Rs 49 at https://tgspdcl-billpay.site or UPI electricity.officer21@okaxis.' },
  ],
  courier: [
    { source: 'sms', sender: '70XXXXXX12', text: 'India Post: Your parcel could not be delivered due to incomplete address. Update within 24 hours: http://indiapost-redelivery.live' },
    { source: 'whatsapp', sender: '+91 70322 11234', text: 'FedEx: your package is held at customs. Pay clearance fee Rs 2,500 to customs.clear9@oksbi to release it today.' },
  ],
  malware_apk: [
    { source: 'whatsapp', sender: '+91 97000 11223', text: 'Traffic violation notice: Your vehicle has a pending e-challan of Rs 1000. Download and install RTO_Challan.apk to view the photo and pay the fine today to avoid court case.' },
    { source: 'whatsapp', sender: '+91 97000 11223', text: 'Shaadi ka card bheja hai, Wedding_Invitation.apk download karke dekho. Zaroor aana!' },
  ],
  job_task: [
    { source: 'whatsapp', sender: '+91 77022 33445', text: 'Part time job: earn Rs 3000-8000 daily by liking YouTube videos. Pay registration Rs 199 to hr.taskpay@ybl and start today.' },
  ],
  upi_collect: [
    { source: 'whatsapp', sender: '+91 91234 50987', text: 'Sir I want to buy your sofa. I am sending Rs 12,000 advance now. Just scan the QR code and enter your UPI PIN to receive the money.' },
  ],
  family_emergency: [
    { source: 'whatsapp', sender: '+92 300 1234567', text: 'Hi Amma, this is my new number. I had an accident and I am in hospital, need money urgently. Send Rs 40,000 now, I will explain later. Dont tell papa.' },
  ],
  phishing_link: [
    { source: 'sms', sender: '63XXXXXX33', text: 'Income Tax refund of Rs 18,400 is approved. Verify your bank account to receive it: https://incometax-refund.co/claim' },
    { source: 'sms', sender: '70XXXXXX78', text: 'Dear customer, HDFC reward points worth Rs 4,999 expire tonight. Redeem now: https://hdfcbnak-rewards.top/redeem' },
  ],
  lottery: [{ source: 'sms', sender: '63XXXXXX33', text: 'Congratulations! Your number won Rs 25 lakh in KBC lottery. Pay processing fee Rs 9,999 to kbc.lottery@axl to claim.' }],
  remote_access: [{ source: 'call', sender: '+91 81212 34567', text: 'To process your refund please install AnyDesk and share the 9 digit code shown on screen with our executive.' }],
  sim_block: [{ source: 'call', sender: '+855 12 345 678', text: 'TRAI: Your mobile number will be blocked in 2 hours due to illegal activity. Press 9 to talk to the officer.' }],
};

export const SAFE_MESSAGES = [
  { source: 'sms' as const, sender: 'JD-HDFCBK-S', text: '[OTP] is your OTP for txn of INR 2,500.00 at AMAZON on HDFC Bank card ending 4321. Valid for 10 mins. Do not share OTP with anyone.' },
  { source: 'sms' as const, sender: 'AD-TGSPDC-S', text: 'Dear Consumer, your electricity bill of Rs 1,240 for USC XXXX5678 is due on 20-Oct-2026. Pay at tgsouthernpower.org or the TGSPDCL app.' },
  { source: 'sms' as const, sender: 'VM-SBIUPI-S', text: 'Dear UPI user A/C X4321 debited by 650.00 on date 12Oct26 trf to APOLLO PHARMACY Refno XXXX4410. If not u? call 1800111109. -SBI' },
  { source: 'whatsapp' as const, sender: 'Ravi', text: 'Amma, reached office. Will call you in the evening.' },
];

/** Cases already in the cyber cell's queue when the demo starts. */
export const DEMO_CASES: {
  elder: number;
  scamType: ScamType;
  hoursAgo: number;
  stage: 'kit_ready' | 'helpline_1930' | 'portal_filed' | 'acknowledged' | 'bank_hold' | 'zero_fir' | 'io_assigned';
  txn?: { amount: number; bank: string; reference: string; payeeVpa?: string; payee?: string };
}[] = [
  { elder: 2, scamType: 'investment', hoursAgo: 0.55, stage: 'kit_ready', txn: { amount: 250000, bank: 'HDFC Bank', reference: 'HDFC628519874', payeeVpa: 'stockguru777@ibl' } },
  { elder: 4, scamType: 'digital_arrest', hoursAgo: 0.25, stage: 'helpline_1930', txn: { amount: 485000, bank: 'SBI', reference: 'SBIN42771109338', payeeVpa: 'rbi.verify@ybl' } },
  { elder: 1, scamType: 'kyc_bank', hoursAgo: 5, stage: 'acknowledged', txn: { amount: 49999, bank: 'SBI', reference: 'SBIN519904772', payee: 'R K ENTERPRISES' } },
  { elder: 3, scamType: 'electricity', hoursAgo: 9, stage: 'bank_hold', txn: { amount: 12500, bank: 'Canara Bank', reference: 'CNRB330218874', payeeVpa: 'electricity.officer21@okaxis' } },
  { elder: 6, scamType: 'courier', hoursAgo: 20, stage: 'portal_filed', txn: { amount: 2500, bank: 'ICICI Bank', reference: 'ICIC612004993', payeeVpa: 'customs.clear9@oksbi' } },
  { elder: 7, scamType: 'family_emergency', hoursAgo: 28, stage: 'zero_fir', txn: { amount: 40000, bank: 'Union Bank', reference: 'UBIN771204093', payee: 'MD SALEEM' } },
  { elder: 5, scamType: 'investment', hoursAgo: 52, stage: 'io_assigned', txn: { amount: 1850000, bank: 'Axis Bank', reference: 'UTIB482913771', payeeVpa: 'arjun.trader88@ybl' } },
  { elder: 8, scamType: 'job_task', hoursAgo: 70, stage: 'acknowledged', txn: { amount: 35000, bank: 'Kotak Bank', reference: 'KKBK093385640', payeeVpa: 'hr.taskpay@ybl' } },
  { elder: 0, scamType: 'malware_apk', hoursAgo: 30, stage: 'kit_ready' },
  { elder: 9, scamType: 'digital_arrest', hoursAgo: 3, stage: 'kit_ready' },
  { elder: 2, scamType: 'phishing_link', hoursAgo: 96, stage: 'io_assigned', txn: { amount: 18400, bank: 'SBI', reference: 'SBIN318842905', payee: 'ONLINE REFUND SERVICES' } },
  { elder: 6, scamType: 'upi_collect', hoursAgo: 120, stage: 'bank_hold', txn: { amount: 12000, bank: 'Bank of Baroda', reference: 'BARB905517318', payeeVpa: '9123450987@ybl' } },
];
