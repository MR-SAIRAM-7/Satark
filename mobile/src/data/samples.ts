import type { Localized, ScamType, Source } from '@satark/shared';

/**
 * Sample messages for "Try an example", the scam drills and the demo room.
 *
 * Scam samples follow scripts that Indian authorities and the press have
 * documented repeatedly (I4C / cybercrime.gov.in advisories, PIB Fact Check,
 * TGCSB warnings). Phone numbers, UPI IDs and domains are placeholders written
 * for the demo, not taken from any real case. Genuine samples follow the real formats banks and
 * utilities use, including TRAI sender suffixes.
 */
export interface Sample {
  id: string;
  title: Localized;
  source: Source;
  sender: string;
  text: string;
  isScam: boolean;
  scamType?: ScamType;
  /** One-line reason shown after a drill answer. */
  lesson: Localized;
}

export const SAMPLES: Sample[] = [
  {
    id: 'digital-arrest',
    title: { en: 'Fake police message', hi: 'नकली पुलिस का संदेश', te: 'నకిలీ పోలీస్ మెసేజ్' },
    source: 'whatsapp',
    sender: '+91 98480 12345',
    text: 'This is Sub-Inspector Vikram Rathod, Mumbai Police Cyber Crime Branch. Your Aadhaar number is linked to a money laundering case. An arrest warrant has been issued in your name. Do not tell anyone. Join the video call now.',
    isScam: true,
    scamType: 'digital_arrest',
    lesson: {
      en: 'Police never arrest anyone over a call or video call.',
      hi: 'पुलिस कभी कॉल या वीडियो कॉल पर गिरफ़्तार नहीं करती।',
      te: 'పోలీసులు కాల్ లేదా వీడియో కాల్‌లో ఎవరినీ అరెస్ట్ చేయరు.',
    },
  },
  {
    id: 'electricity',
    title: { en: 'Electricity cut warning', hi: 'बिजली कटने की चेतावनी', te: 'కరెంట్ కట్ హెచ్చరిక' },
    source: 'sms',
    sender: '9876543210',
    text: 'Dear Customer Your Electricity power will be disconnected. Tonight at 9.30 pm from electricity office. because your previous month bill was not update. Please immediately contact with our electricity officer 9876543210 Thank you.',
    isScam: true,
    scamType: 'electricity',
    lesson: {
      en: 'The electricity board never texts from a mobile number or threatens to cut power tonight.',
      hi: 'बिजली विभाग कभी मोबाइल नंबर से संदेश नहीं भेजता, न आज रात बिजली काटने की धमकी देता है।',
      te: 'విద్యుత్ శాఖ మొబైల్ నంబర్ నుండి మెసేజ్ పంపదు, ఈ రాత్రే కరెంట్ కట్ చేస్తామని బెదిరించదు.',
    },
  },
  {
    id: 'kyc-link',
    title: { en: 'Bank KYC link', hi: 'बैंक KYC लिंक', te: 'బ్యాంక్ KYC లింక్' },
    source: 'sms',
    sender: '9812345670',
    text: 'Dear customer your SBI YONO account will be blocked today. Please update your PAN card immediately click here http://sbi-yono-kyc.xyz/update',
    isScam: true,
    scamType: 'kyc_bank',
    lesson: {
      en: 'Banks send SMS from registered sender IDs, not 10-digit numbers, and never from look-alike websites.',
      hi: 'बैंक रजिस्टर्ड सेंडर आईडी से SMS भेजते हैं, 10 अंकों के नंबर से नहीं, और कभी नकली वेबसाइट से नहीं।',
      te: 'బ్యాంకులు రిజిస్టర్డ్ సెండర్ ఐడీ నుండి SMS పంపుతాయి, 10 అంకెల నంబర్ నుండి కాదు, నకిలీ వెబ్‌సైట్ల నుండి అసలే కాదు.',
    },
  },
  {
    id: 'kyc-telugu',
    title: { en: 'Telugu KYC message', hi: 'तेलुगु KYC संदेश', te: 'తెలుగు KYC మెసేజ్' },
    source: 'whatsapp',
    sender: '+91 90000 43210',
    text: 'ప్రియమైన కస్టమర్, మీ SBI ఖాతా ఈరోజే బ్లాక్ అవుతుంది. వెంటనే KYC అప్‌డేట్ చేయడానికి ఈ లింక్ క్లిక్ చేయండి: http://sbi-kyc-verify.live మీ OTP చెప్పండి.',
    isScam: true,
    scamType: 'kyc_bank',
    lesson: {
      en: 'No bank asks for your OTP. The link is not an SBI website.',
      hi: 'कोई बैंक आपका OTP नहीं माँगता। यह लिंक SBI की वेबसाइट नहीं है।',
      te: 'ఏ బ్యాంకూ మీ OTP అడగదు. ఈ లింక్ SBI వెబ్‌సైట్ కాదు.',
    },
  },
  {
    id: 'challan-apk',
    title: { en: 'Traffic challan file', hi: 'ट्रैफ़िक चालान फ़ाइल', te: 'ట్రాఫిక్ చలాన్ ఫైల్' },
    source: 'whatsapp',
    sender: '+91 97000 11223',
    text: 'Traffic violation notice: Your vehicle has a pending e-challan of Rs 1000. Download and install RTO_Challan.apk to view the photo and pay the fine today to avoid court case.',
    isScam: true,
    scamType: 'malware_apk',
    lesson: {
      en: 'Never install an app file (APK) sent in a message. Challans are on parivahan.gov.in.',
      hi: 'संदेश में आई ऐप फ़ाइल (APK) कभी इंस्टॉल न करें। चालान parivahan.gov.in पर होते हैं।',
      te: 'మెసేజ్‌లో వచ్చిన యాప్ ఫైల్ (APK) ఎప్పుడూ ఇన్‌స్టాల్ చేయకండి. చలాన్లు parivahan.gov.in లో ఉంటాయి.',
    },
  },
  {
    id: 'trading',
    title: { en: 'Trading tips group', hi: 'ट्रेडिंग टिप्स ग्रुप', te: 'ట్రేడింగ్ టిప్స్ గ్రూప్' },
    source: 'whatsapp',
    sender: '+91 96400 55667',
    text: 'Namaste sir, mana VIP stock trading group lo join avvandi. Guaranteed returns 30% per week, risk free. Minimum investment Rs 50,000. Professor Arjun insider tips daily. Send money to UPI arjun.trader88@ybl and share screenshot.',
    isScam: true,
    scamType: 'investment',
    lesson: {
      en: 'Guaranteed returns do not exist. Trading frauds are the biggest loss for Hyderabad seniors.',
      hi: 'गारंटीड मुनाफ़ा जैसी कोई चीज़ नहीं होती। हैदराबाद के बुज़ुर्गों का सबसे बड़ा नुकसान ट्रेडिंग ठगी से हुआ है।',
      te: 'గ్యారెంటీ లాభాలు అనేవి ఉండవు. హైదరాబాద్ వృద్ధులు ఎక్కువగా నష్టపోయింది ట్రేడింగ్ మోసాల్లోనే.',
    },
  },
  {
    id: 'upi-qr',
    title: { en: '"Scan to receive money"', hi: '"पैसे पाने के लिए स्कैन करें"', te: '"డబ్బు కోసం స్కాన్ చేయండి"' },
    source: 'whatsapp',
    sender: '+91 91234 50987',
    text: 'Sir I want to buy your sofa. I am sending Rs 12,000 advance now. Just scan the QR code and enter your UPI PIN to receive the money. upi://pay?pa=9123450987@ybl&pn=Rahul%20Sharma&am=12000',
    isScam: true,
    scamType: 'upi_collect',
    lesson: {
      en: 'You never scan a QR or enter a PIN to receive money. That sends your money out.',
      hi: 'पैसे पाने के लिए कभी QR स्कैन या पिन नहीं डालते। ऐसा करने से आपके पैसे चले जाते हैं।',
      te: 'డబ్బు అందుకోవడానికి QR స్కాన్ చేయడం, పిన్ ఎంటర్ చేయడం ఎప్పుడూ ఉండదు. అలా చేస్తే మీ డబ్బు పోతుంది.',
    },
  },
  {
    id: 'family',
    title: { en: 'Relative on a new number', hi: 'नए नंबर से रिश्तेदार', te: 'కొత్త నంబర్ నుండి బంధువు' },
    source: 'whatsapp',
    sender: '+91 93900 77881',
    text: 'Hi Amma, this is my new number. My phone got damaged. I had an accident and I am in hospital, need money urgently. Please send me Rs 40,000 on this number now, I will explain later.',
    isScam: true,
    scamType: 'family_emergency',
    lesson: {
      en: 'Ask for the family safe word, or call your relative on their old number.',
      hi: 'पारिवारिक सेफ़-वर्ड पूछें, या रिश्तेदार को उनके पुराने नंबर पर कॉल करें।',
      te: 'కుటుంబ సేఫ్ వర్డ్ అడగండి, లేదా మీ బంధువు పాత నంబర్‌కు కాల్ చేయండి.',
    },
  },
  {
    id: 'genuine-otp',
    title: { en: 'Bank OTP', hi: 'बैंक OTP', te: 'బ్యాంక్ OTP' },
    source: 'sms',
    sender: 'JD-HDFCBK-S',
    text: '482913 is your OTP for txn of INR 2,500.00 at AMAZON on HDFC Bank card ending 4321. Valid for 10 mins. Do not share OTP with anyone.',
    isScam: false,
    lesson: {
      en: 'A real OTP comes from a registered sender ID (ending -S or -T) and tells you not to share it.',
      hi: 'असली OTP रजिस्टर्ड सेंडर आईडी (-S या -T पर ख़त्म) से आता है और उसे साझा न करने को कहता है।',
      te: 'నిజమైన OTP రిజిస్టర్డ్ సెండర్ ఐడీ (-S లేదా -T తో ముగిసేది) నుండి వస్తుంది, ఎవరికీ చెప్పవద్దని చెబుతుంది.',
    },
  },
  {
    id: 'genuine-bill',
    title: { en: 'Electricity bill', hi: 'बिजली का बिल', te: 'కరెంట్ బిల్లు' },
    source: 'sms',
    sender: 'AD-TGSPDC-S',
    text: 'Dear Consumer, your electricity bill of Rs 1,240 for USC 102345678 is due on 20-Oct-2026. Pay at tgsouthernpower.org or the TGSPDCL app.',
    isScam: false,
    lesson: {
      en: 'A real bill comes from a registered sender ID, names the official website and does not threaten you.',
      hi: 'असली बिल रजिस्टर्ड सेंडर आईडी से आता है, आधिकारिक वेबसाइट बताता है और धमकी नहीं देता।',
      te: 'నిజమైన బిల్లు రిజిస్టర్డ్ సెండర్ ఐడీ నుండి వస్తుంది, అధికారిక వెబ్‌సైట్ పేరు చెబుతుంది, బెదిరించదు.',
    },
  },
  {
    id: 'genuine-debit',
    title: { en: 'Bank debit alert', hi: 'बैंक डेबिट अलर्ट', te: 'బ్యాంక్ డెబిట్ అలర్ట్' },
    source: 'sms',
    sender: 'VM-SBIUPI-S',
    text: 'Dear UPI user A/C X4321 debited by 650.00 on date 12Oct26 trf to APOLLO PHARMACY Refno 628519874410. If not u? call 1800111109. -SBI',
    isScam: false,
    lesson: {
      en: 'Real debit alerts state the amount and a reference, and give the bank\'s own helpline.',
      hi: 'असली डेबिट अलर्ट में रकम और रेफ़रेंस होता है, और बैंक की अपनी हेल्पलाइन दी होती है।',
      te: 'నిజమైన డెబిట్ అలర్ట్‌లో మొత్తం, రిఫరెన్స్ ఉంటాయి, బ్యాంక్ సొంత హెల్ప్‌లైన్ నంబర్ ఉంటుంది.',
    },
  },
];

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);

/** A short, mixed set for one drill round. */
export const DRILL_IDS = ['electricity', 'genuine-otp', 'upi-qr', 'genuine-bill', 'digital-arrest', 'family'];
