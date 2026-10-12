/**
 * Message templates for the layer-3 training corpus.
 *
 * Scam templates follow scripts that Indian authorities and the press have
 * documented repeatedly (I4C / cybercrime.gov.in advisories, PIB Fact Check,
 * TGCSB and RBI warnings). Genuine templates follow the real formats banks,
 * utilities, couriers and families use, and include hard negatives: official
 * awareness messages that quote scam phrases ("police never arrest on a video
 * call"). Every number, UPI ID and domain is generated; none comes from a real case.
 *
 * `{slot}` placeholders are filled from SLOTS by generate.ts.
 */
import type { ScamType } from '@satark/shared';

export interface Template {
  id: string;
  label: 0 | 1;
  family: ScamType | 'genuine';
  text: string;
}

export const SLOTS: Record<string, string[]> = {
  name: ['Ramesh', 'Lakshmi', 'Suresh', 'Padma', 'Venkat', 'Anita', 'Rajesh', 'Kavitha', 'Srinivas', 'Meena', 'Arjun', 'Sunita', 'Prakash', 'Radha', 'Vikram'],
  officer: ['Sub-Inspector Vikram Rathod', 'Inspector Sharma', 'DCP Anil Kumar', 'Officer R. K. Singh', 'Inspector Prakash Patil', 'ACP Deshmukh'],
  agency: ['Mumbai Police', 'CBI', 'Narcotics Control Bureau', 'Customs Department', 'Enforcement Directorate', 'Delhi Cyber Crime Branch', 'TRAI legal cell', 'RBI vigilance', 'Crime Branch'],
  bank: ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Canara Bank', 'PNB', 'Bank of Baroda', 'Union Bank', 'Kotak Bank', 'Indian Bank'],
  amount: ['Rs 49,999', 'Rs 1,25,000', 'Rs. 75,000', 'INR 2,40,000', '₹ 50,000', 'Rs 3,50,000', 'Rs 99,000', '₹1,80,000', 'Rs 10 lakh'],
  small: ['Rs 10', 'Rs 25', 'Rs 49', 'Rs 199', 'Rs 1,240', 'Rs 650', 'Rs 2,500', 'Rs 1,000', 'Rs 349', 'Rs 899'],
  amt: ['650.00', '1,240.00', '2,500.00', '15,000.00', '499.00', '12,750.00', '3,100.00', '25,000.00', '86.00', '7,800.00'],
  mobile: ['9876543210', '9812345670', '9000054321', '8885512345', '7702233445', '9346677889', '6300112233', '9949012345', '8121234567', '7032345678'],
  intl: ['+44 7700 900123', '+1 202 555 0147', '+92 300 1234567', '+855 12 345 678', '+971 50 123 4567'],
  scamurl: [
    'http://sbi-yono-kyc.xyz/update', 'https://hdfcbnak-rewards.top/redeem', 'http://indiapost-redelivery.live', 'https://icici-kyc-update.online',
    'http://bit.ly/3kYcUpd', 'https://tgspdcl-billpay.site', 'http://axis-bank-verify.in.net', 'https://incometax-refund.co/claim',
    'http://pmkisan-update.info', 'https://fedex-customs-clear.shop', 'http://sbi.co.in.kyc-verify.click', 'https://yono-sbi-reward.top',
  ],
  goodurl: ['sbi.co.in', 'hdfcbank.com', 'tgsouthernpower.org', 'indiapost.gov.in', 'incometax.gov.in', 'cybercrime.gov.in', 'amazon.in', 'flipkart.com', 'irctc.co.in', 'myaadhaar.uidai.gov.in'],
  upi: ['arjun.trader88@ybl', 'electricity.officer21@okaxis', 'rbi.verify@ybl', 'refund.desk@paytm', 'customs.clear9@oksbi', 'stockguru777@ibl', 'kbc.lottery@axl', 'hr.taskpay@ybl', 'cbi.safekeep@okhdfcbank'],
  courier: ['FedEx', 'DHL', 'Blue Dart', 'India Post', 'DTDC'],
  drug: ['MDMA', 'illegal drugs', '5 fake passports', 'banned substances', '200 grams of narcotics'],
  stock: ['Reliance', 'Tata Motors', 'an upcoming IPO', 'Adani Ports', 'a penny stock'],
  pct: ['20%', '30%', '45%', '200%', '15% daily', '3x'],
  app: ['AnyDesk', 'TeamViewer QuickSupport', 'RustDesk', 'AirDroid'],
  apk: ['RTO_Challan.apk', 'SBI_Rewards.apk', 'Wedding_Invitation.apk', 'PM_Kisan.apk', 'Aadhaar_Update.apk', 'Electricity_Bill.apk', 'Customer_Support.apk'],
  relation: ['Amma', 'Nanna', 'Mummy', 'Papa', 'Uncle', 'Aunty', 'Maa'],
  item: ['sofa', 'old fridge', 'washing machine', 'bike', 'dining table', 'cupboard'],
  time: ['9.30 pm', '10 pm', 'tonight', 'within 2 hours', 'today itself', 'within 24 hours'],
  caseno: ['MH/CR/2026/4471', 'CBI/ML/889/2026', 'NCB-DL-2026-1182', 'ED/PMLA/552'],
  otp: ['482913', '771204', '093385', '640021', '318842', '905517'],
  last4: ['4321', '0917', '7781', '2264', '5530', '1189'],
  merchant: ['AMAZON', 'APOLLO PHARMACY', 'BIGBASKET', 'SWIGGY', 'RELIANCE FRESH', 'IRCTC', 'ZOMATO', 'DMART'],
  utr: ['628519874410', '427711093385', '519904772163', '330218874561', '612004993870'],
  date: ['12-Oct-26', '03-Oct-26', '28-Sep-26', '15-Oct-26', '20-Oct-26', '09-Oct-26'],
  product: ['a pressure cooker', 'reading glasses', 'a BP monitor', 'a mobile cover', 'a ceiling fan', 'bed sheets'],
  doctor: ['Dr Rao', 'Dr Sharma', 'Dr Reddy', 'Dr Fatima', 'Dr Iyer'],
  hospital: ['Apollo Hospitals', 'Yashoda Hospitals', 'KIMS', 'Care Hospitals', 'Rainbow Clinic'],
  app2: ['PhonePe', 'Swiggy', 'DigiLocker', 'Paytm', 'Zomato', 'IRCTC', 'Uber'],
  telco: ['Airtel', 'Jio', 'Vi', 'BSNL'],
};

const scam = (family: ScamType, texts: string[]): Template[] =>
  texts.map((text, i) => ({ id: `${family}-${i + 1}`, label: 1, family, text }));

const genuine = (group: string, texts: string[]): Template[] =>
  texts.map((text, i) => ({ id: `genuine-${group}-${i + 1}`, label: 0, family: 'genuine', text }));

export const TEMPLATES: Template[] = [
  ...scam('digital_arrest', [
    'This is {officer}, {agency}. Your Aadhaar number is linked to a money laundering case. An arrest warrant has been issued in your name. Do not tell anyone. Join the video call now.',
    'Hello sir, {courier} here. A parcel booked in your name contains {drug}. Your case is transferred to {agency}. You are under digital arrest, do not disconnect the call.',
    '{agency} notice: case no {caseno} is registered against you. To avoid arrest transfer {amount} to the RBI verification account for safe keeping. Keep this strictly confidential.',
    'Aapke Aadhaar se 3 SIM card issue hue hain jo illegal kaam me use hue. {agency} officer se baat karwate hain. Kisi ko mat batana warna turant arrest hoga.',
    'మీ ఆధార్ కార్డు మనీ లాండరింగ్ కేసులో ఉంది. మేము {agency} నుండి మాట్లాడుతున్నాం. ఈ విషయం ఎవరికీ చెప్పకండి, వీడియో కాల్‌లో ఉండండి.',
    'Madam you are under investigation by {agency}. Stay on the video call and do not inform your family. Send your FD amount to the account we give for verification, it will be returned in 24 hours.',
    'Your bank account is used for terror funding. {officer} speaking. Supreme Court order is issued. Transfer {amount} for verification or you will be arrested today.',
    'आपके नाम पर {agency} में केस दर्ज है। गिरफ्तारी से बचने के लिए तुरंत {amount} वेरिफिकेशन खाते में भेजें। यह बात किसी को न बताएं।',
  ]),
  ...scam('kyc_bank', [
    'Dear customer your {bank} account will be blocked today. Please update your PAN card immediately click here {scamurl}',
    '{bank}: Your netbanking access is suspended due to incomplete KYC. Click {scamurl} to reactivate {time}.',
    'Dear {bank} user, your debit card has been blocked. Share the OTP you received to unblock it or call {mobile}.',
    'Aapka {bank} khata aaj band ho jayega. KYC update ke liye is link par click kare {scamurl}',
    'ప్రియమైన కస్టమర్, మీ {bank} ఖాతా ఈరోజే బ్లాక్ అవుతుంది. వెంటనే KYC అప్‌డేట్ చేయడానికి ఈ లింక్ క్లిక్ చేయండి {scamurl} మీ OTP చెప్పండి.',
    'Your {bank} YONO account is deactivated. Update Aadhaar and PAN now at {scamurl} else account will be permanently closed.',
    'KYC expired! {bank} customer, call our KYC desk on {mobile} and tell the 6 digit code to avoid account freeze.',
  ]),
  ...scam('investment', [
    'Namaste sir, join our VIP stock trading group. Guaranteed returns {pct} per week, risk free. Minimum investment {amount}. Send money to UPI {upi} and share screenshot.',
    'Professor {name} insider tips: {stock} will double tomorrow. Pay membership fee {small} to {upi} and join the premium group.',
    'Earn {pct} with our AI crypto trading bot. 100% safe, SEBI registered. Deposit {amount} today, withdraw profit anytime. WhatsApp {mobile}.',
    'IPO allotment guaranteed through our institutional account. Deposit {amount} today. Limited seats, offer closes {time}.',
    'Mana VIP trading group lo join avvandi sir. {pct} returns guarantee. {upi} ki pay cheyandi, profits daily mee account ki vastayi.',
    'Congratulations! You are selected for our stock market mentorship. Daily profit {pct}. Download our trading app and add funds of {amount}.',
  ]),
  ...scam('electricity', [
    'Dear Customer your electricity power will be disconnected {time} from electricity office because your previous month bill was not update. Please immediately contact with our electricity officer {mobile} Thank you.',
    'TGSPDCL: Your power connection will be cut today. Pay pending bill {small} immediately at {scamurl} or call {mobile}.',
    'Priya upbhokta, aapki bijli {time} kaat di jayegi. Turant bijli adhikari {mobile} se sampark kare.',
    'Electricity bill not updated. Your connection will be disconnected {time}. Call officer {mobile} and update via {upi}.',
    'మీ కరెంట్ బిల్లు అప్‌డేట్ కాలేదు. ఈ రాత్రి {time} కరెంట్ కట్ అవుతుంది. వెంటనే {mobile} కు కాల్ చేయండి.',
  ]),
  ...scam('courier', [
    'India Post: Your parcel could not be delivered due to incomplete address. Update your address within 24 hours: {scamurl}',
    '{courier}: Your package is held at customs. Pay clearance fee {small} at {scamurl} to release it today.',
    '{courier} alert: a parcel from Taiwan in your name contains {drug}. Press 1 to speak to the customs officer now.',
    'Your shipment is on hold. Redelivery charge {small}. Pay now {scamurl} otherwise it will be returned.',
  ]),
  ...scam('lottery', [
    'Congratulations! Your number won Rs 25 lakh in KBC lottery. Pay processing fee {small} to claim. Contact manager on {mobile}.',
    'You have won an iPhone 17 in the Jio lucky draw! Send GST charges {small} to {upi} to receive the prize.',
    'Badhai ho! Aapne {amount} ka inaam jeeta hai. Inaam paane ke liye registration fee {small} bheje.',
  ]),
  ...scam('job_task', [
    'Part time job offer: earn Rs 3000-8000 daily by liking YouTube videos. Contact HR on WhatsApp {mobile}.',
    'Hi, I am {name} from Amazon HR. Work from home simple task. Pay registration {small} and earn commission on every prepaid task.',
    'Telegram task: rate hotels and earn {pct} profit. Deposit {amount} to unlock VIP tasks and withdraw same day.',
    'Ghar baithe kamaye Rs 5000 roz. Sirf video like karna hai. Joining fee {small} bhejo {upi} par.',
  ]),
  ...scam('upi_collect', [
    'Sir I want to buy your {item}. I am sending Rs 12,000 advance now. Just scan the QR code and enter your UPI PIN to receive the money.',
    'Your refund of {small} is pending. Accept the collect request and enter your PIN to receive the amount.',
    'I am an army officer posted at the border, I will pay for your {item}. Scan this QR to get payment upi://pay?pa={upi}&am=15000',
    'Cashback of {small} credited! Approve the request on PhonePe and enter UPI PIN to receive it in your account.',
  ]),
  ...scam('malware_apk', [
    'Traffic violation notice: Your vehicle has a pending e-challan of {small}. Download and install {apk} to view the photo and pay the fine today.',
    'Your {bank} reward points worth {small} expire today. Install {apk} to redeem them now.',
    'Shaadi ka card bheja hai, {apk} download karke dekho. Zaroor aana!',
    'Aadhaar update mandatory. Install {apk} and fill your bank details to avoid deactivation.',
  ]),
  ...scam('remote_access', [
    'To process your refund please install {app} from Play Store and share the 9 digit code shown on screen with our executive.',
    'Bank KYC verification: download {app} and tell me the code. I will update your account from here, do not cut the call.',
    'Customer care here. Your UPI is not working. Install {app} so I can fix it, then open your bank app.',
  ]),
  ...scam('family_emergency', [
    'Hi {relation}, this is my new number. My phone got damaged. I had an accident and I am in hospital, need money urgently. Send {amount} on this number now, I will explain later.',
    '{relation} mera phone kho gaya, ye mera naya number hai. Urgent {amount} chahiye, abhi bhejo. Papa ko mat batana.',
    '{relation}, I am stuck at the airport, my card is blocked. Please send {small} to {upi} immediately. Don\'t call, I can\'t talk now.',
    '{relation} nenu kotha number nunchi message chestunna. Hospital lo unna, {amount} vente pampu, evariki cheppaku.',
  ]),
  ...scam('sim_block', [
    'TRAI: Your mobile number will be blocked in 2 hours due to illegal activity. Press 9 to talk to the officer.',
    'Your SIM card KYC has expired. Your SIM will be deactivated today. Call {mobile} immediately.',
    'DoT notice: all numbers on your Aadhaar will be suspended {time}. Contact cyber cell officer at {mobile}.',
  ]),
  ...scam('phishing_link', [
    'Income Tax refund of {amount} is approved. Verify your bank account to receive it: {scamurl}',
    'Your PM Kisan installment is pending. Update your details at {scamurl} to receive Rs 6000.',
    'Dear customer, credit card reward points worth {small} are expiring tonight. Redeem now: {scamurl}',
    'Your electricity subsidy of {small} is ready. Claim at {scamurl} before {time}.',
  ]),

  ...genuine('otp', [
    '{otp} is your OTP for txn of INR {amt} at {merchant} on {bank} card ending {last4}. Valid for 10 mins. Do not share OTP with anyone.',
    'Your OTP for login to {app2} is {otp}. Do not share it with anyone.',
    '{otp} is the OTP to verify your mobile number on {app2}. Never share your OTP with anyone.',
    '{otp} aapka OTP hai. Kisi ke saath share na kare. -{bank}',
    'OTP {otp} for your {bank} netbanking login. It is valid for 5 minutes. {bank} never asks for OTP over call.',
  ]),
  ...genuine('txn', [
    'Dear UPI user A/C X{last4} debited by {amt} on date {date} trf to {merchant} Refno {utr}. If not u? call 1800111109. -SBI',
    'INR {amt} credited to your A/c XX{last4} on {date} by NEFT. Avl Bal INR 48,230.50. -{bank}',
    'Your a/c no. XX{last4} is debited for Rs.{amt} on {date} and credited to {merchant} (UPI Ref No {utr}).',
    'Pension of Rs 32,500.00 credited to your account XX{last4} on {date}. -{bank}',
    'Rs.{amt} spent on your {bank} Credit Card ending {last4} at {merchant} on {date}. Avl limit Rs 1,02,000.',
    'Received Rs {amt} from {name} via PhonePe. UPI Ref {utr}.',
  ]),
  ...genuine('bill', [
    'Dear Consumer, your electricity bill of {small} for USC 102345678 is due on {date}. Pay at tgsouthernpower.org or the TGSPDCL app.',
    'Your {telco} bill of {small} is due on {date}. Pay via the {telco} app. Please ignore if already paid.',
    'Payment of {small} received for your {telco} number. Thank you for being a valued customer.',
    'HMWSSB: Water bill for CAN 0145778 is {small}, due on {date}. Pay online at hyderabadwater.gov.in.',
    'Your gas cylinder booking is confirmed. Booking no 9934. Delivery within 2 days. -HP Gas',
  ]),
  ...genuine('delivery', [
    'Your Amazon order for {product} has been shipped and will arrive by Thursday.',
    'Out for delivery: your Flipkart package with {product} will be delivered today. Share OTP {otp} with the delivery agent only at the door.',
    'India Post: Article EM123456789IN booked on {date} has been delivered. Track at indiapost.gov.in',
    'Swiggy: your order from Paradise Biryani is on the way. Track it in the app.',
    'Blue Dart: Shipment 77812345 will be delivered today between 2 PM and 6 PM.',
  ]),
  ...genuine('service', [
    'Reminder: your appointment with {doctor} at {hospital} is on {date} at 10:30 AM. Please carry previous reports.',
    'PNR 4521876390: Train 12727 Godavari Exp, {date}, coach S4 berth 32. Have a safe journey. -IRCTC',
    'Your cheque book request has been processed and will be delivered in 7 working days. -{bank}',
    'Your FD of {amount} matured on {date} and the proceeds were credited to your savings account. -{bank}',
    'Your e-statement for September has been sent to your registered email ID. -{bank}',
    'Your Aadhaar update request has been completed. Download e-Aadhaar from myaadhaar.uidai.gov.in. -UIDAI',
    'Your ITR for AY 2026-27 has been processed. Refund of {small} will be credited to your pre-validated bank account. -Income Tax Department',
    'Lab report for {name} is ready. Collect it from {hospital} reception or view it in the app.',
  ]),
  ...genuine('family', [
    '{relation}, reached office. Will call you in the evening.',
    'Nanna, ee Sunday intiki vastunna. Emaina kavali ante cheppu.',
    'Beta dinner ke liye kya banau? Papa aaj late aayenge.',
    'Happy birthday {name}! Have a wonderful year ahead.',
    'Meeting postponed to 4 PM. Please share the slides before that.',
    'Did you take your BP tablet today? Doctor said not to skip it.',
    'అమ్మా, నేను బయలుదేరాను. సాయంత్రం ఫోన్ చేస్తాను.',
    'पापा, मैं घर पहुँच गया। कल बात करते हैं।',
    'Temple ki Saturday veldam. Aunty kuda vastanannaru.',
    'Please send the photos from the wedding when you get time.',
    '{name}, I transferred the rent for this month. Please check and confirm.',
    'Uncle the plumber will come at 11. Please keep the gate open.',
  ]),
  ...genuine('awareness', [
    'Beware of digital arrest scams. Police never arrest anyone over a video call. Report fraud at 1930 or cybercrime.gov.in. -TGCSB',
    '{bank} never asks for your OTP, PIN or password. Do not share them with anyone. Report fraud on 1930.',
    'RBI says: banks never send KYC update links by SMS. Do not click unknown links. Stay alert.',
    'Do not install apps sent on WhatsApp or SMS. Fake e-challan APKs steal bank data. -Hyderabad City Police',
    'Nobody needs your UPI PIN to send you money. If someone asks you to scan a QR to receive money, it is a fraud. -NPCI',
    'Cyber fraud alert: callers posing as CBI or customs officers are fake. Hang up and call 1930.',
  ]),
  ...genuine('chat', [
    'Good morning {relation}! Hope you slept well.',
    'I will be late today, traffic is very bad on the flyover.',
    'Can you send me the recipe for the pulihora you made last week?',
    'Reached Bengaluru safely. Will call after dinner.',
    'Did the electrician come today? The fan in the bedroom is still not working.',
    'Kal subah 7 baje mandir chalenge. Taiyar rehna.',
    'Mee aarogyam ela undi? Mandulu time ki vesukuntunnara?',
    'Watch the cricket match tonight, India is batting first!',
    'Your grandson got 95 in maths. He wants to talk to you.',
    'Bring curd and vegetables on the way back please.',
    'The doctor said the knee is healing well. Next visit in two weeks.',
    'Can we do a video call on Sunday evening? The kids want to see you.',
    'Aaj khana bahut accha bana tha, thank you Maa.',
    'Ammamma ki birthday wishes cheppandi, nenu sayantram call chestanu.',
    'Please lock the main door before sleeping.',
    'I sent the photos of the new house on the family group.',
    'The society meeting is on Saturday at 6 PM in the clubhouse.',
    'Ravi uncle is admitted for a check-up, nothing serious. Visiting hours are 5 to 7.',
    'మీరు భోజనం చేశారా? నేను రేపు వస్తాను.',
    'माँ, दवाई समय पर ले लेना। रात को फोन करूँगा।',
    'Yoga class is cancelled tomorrow, the teacher is travelling.',
    'Got your parcel with the sweets, thank you so much!',
    'The pension papers are ready, I will drop them at the bank on Monday.',
    'Rain is heavy here, do not go out for the walk today.',
    'Train is running 40 minutes late, will reach by 9.',
  ]),
  ...genuine('awareness2', [
    'Satark tip: real police never ask for money on a call. If anyone threatens arrest, cut the call and dial 1930.',
    'Fraudsters are sending fake electricity disconnection messages. TGSPDCL never sends SMS from mobile numbers. -TGSPDCL',
    'Beware of fake job offers asking for registration fees. Report on cybercrime.gov.in. -I4C',
    'Never share OTP, CVV or UPI PIN with anyone, not even bank staff. -{bank}',
    'Investment fraud alert: no one can guarantee stock market returns. Verify advisers on the SEBI website.',
    'Received a call about a parcel with drugs? It is a scam. Customs never calls like this. Report at 1930.',
  ]),
  ...genuine('service2', [
    'Your Aadhaar-linked mobile number update was successful. -UIDAI',
    'Your Life Certificate (Jeevan Pramaan) has been submitted successfully for pension ID 8812. -{bank}',
    'Dear customer, your new debit card has been dispatched by Speed Post and will reach you in 5 days. -{bank}',
    'Your appointment for passport verification is on {date} at Begumpet PSK. Carry original documents.',
    'Your property tax payment of {small} has been received. Receipt no 44812. -GHMC',
    'Thank you for visiting {hospital}. Your bill of {small} has been paid. Get well soon.',
    'Your LIC premium of {small} is due on {date}. Pay at licindia.in or any branch.',
    'Your Metro card has been recharged with {small}. -Hyderabad Metro Rail',
    'Your complaint no 77125 regarding street light has been resolved. -GHMC',
    'Book your COVID and flu booster at the nearest PHC. Free for senior citizens. -Health Dept',
  ]),
  ...genuine('promo', [
    'Big Billion Days: up to 70% off on electronics. Shop now on flipkart.com. T&C apply.',
    'Get flat 20% off on your next order at Dominos. Use code PIZZA20. Valid till Sunday.',
    'Pre-approved personal loan up to Rs 5 lakh. Apply in the {bank} app. T&C apply.',
    'Diwali sale at Reliance Trends: buy 2 get 1 free. Visit your nearest store.',
    '{telco}: Recharge with Rs 349 and get unlimited calls and 2GB/day for 28 days.',
  ]),
];
