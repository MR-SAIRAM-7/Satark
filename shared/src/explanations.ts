/**
 * Cached explanations per scam type, in Telugu, Hindi and English.
 * This is the last link of the fallback chain (LLM -> Sarvam -> cached): the
 * elder always gets a clear reason and a spoken warning, even fully offline.
 */
import type { LangCode } from './languages';
import type { Localized, ScamType, Verdict } from './types';

export interface ScamTypeInfo {
  label: Localized;
  explanation: Localized;
  /** Short warning, written to be spoken aloud. */
  voice: Localized;
  advice: { en: string[]; hi: string[]; te: string[] };
}

export const SCAM_TYPES: Record<ScamType, ScamTypeInfo> = {
  digital_arrest: {
    label: { en: 'Digital arrest scam', hi: 'डिजिटल अरेस्ट ठगी', te: 'డిజిటల్ అరెస్ట్ మోసం' },
    explanation: {
      en: 'Someone is pretending to be the police or a government officer and frightening you with arrest. There is no such thing as a "digital arrest" in Indian law.',
      hi: 'कोई पुलिस या सरकारी अधिकारी बनकर आपको गिरफ़्तारी का डर दिखा रहा है। भारतीय कानून में "डिजिटल अरेस्ट" जैसी कोई चीज़ नहीं है।',
      te: 'ఎవరో పోలీస్ లేదా ప్రభుత్వ అధికారిగా నటిస్తూ, అరెస్ట్ చేస్తామని మిమ్మల్ని భయపెడుతున్నారు. భారత చట్టంలో "డిజిటల్ అరెస్ట్" అనేది లేదు.',
    },
    voice: {
      en: 'This is a scam. Real police never arrest anyone on a call. Cut the call and tell your family.',
      hi: 'यह ठगी है। असली पुलिस कभी फ़ोन पर किसी को गिरफ़्तार नहीं करती। कॉल काट दीजिए और परिवार को बताइए।',
      te: 'ఇది మోసం. నిజమైన పోలీసులు ఫోన్‌లో ఎవరినీ అరెస్ట్ చేయరు. కాల్ కట్ చేసి, మీ కుటుంబ సభ్యులకు చెప్పండి.',
    },
    advice: {
      en: ['Cut the call', 'Do not pay or share any details', 'Tell your family', 'Call 1930'],
      hi: ['कॉल काट दें', 'पैसे न भेजें, कोई जानकारी न दें', 'परिवार को बताएं', '1930 पर कॉल करें'],
      te: ['కాల్ కట్ చేయండి', 'డబ్బు పంపకండి, వివరాలు చెప్పకండి', 'కుటుంబ సభ్యులకు చెప్పండి', '1930కి కాల్ చేయండి'],
    },
  },
  kyc_bank: {
    label: { en: 'Fake bank / KYC message', hi: 'नकली बैंक / KYC संदेश', te: 'నకిలీ బ్యాంక్ / KYC సందేశం' },
    explanation: {
      en: 'This pretends to be your bank and pushes you to update KYC or unblock your account through a link. Banks never ask for this by message.',
      hi: 'यह खुद को आपका बैंक बताकर लिंक से KYC अपडेट करने या खाता चालू करने का दबाव डाल रहा है। बैंक कभी संदेश से ऐसा नहीं कहते।',
      te: 'ఇది మీ బ్యాంక్ అని నటిస్తూ, లింక్ ద్వారా KYC అప్‌డేట్ చేయమని లేదా ఖాతా అన్‌బ్లాక్ చేయమని ఒత్తిడి చేస్తోంది. బ్యాంకులు మెసేజ్ ద్వారా ఇలా ఎప్పుడూ అడగవు.',
    },
    voice: {
      en: 'This is a scam. Your bank never asks for KYC or OTP by message. Do not open the link.',
      hi: 'यह ठगी है। आपका बैंक कभी संदेश से KYC या OTP नहीं माँगता। लिंक मत खोलिए।',
      te: 'ఇది మోసం. మీ బ్యాంక్ మెసేజ్ ద్వారా KYC లేదా OTP ఎప్పుడూ అడగదు. లింక్ తెరవకండి.',
    },
    advice: {
      en: ['Do not open the link', 'Never share OTP or PIN', 'Call your bank on the number printed on your card'],
      hi: ['लिंक न खोलें', 'OTP या पिन कभी न बताएं', 'अपने कार्ड पर छपे नंबर से बैंक को कॉल करें'],
      te: ['లింక్ తెరవకండి', 'OTP లేదా పిన్ ఎప్పుడూ చెప్పకండి', 'మీ కార్డుపై ముద్రించిన నంబర్‌కు కాల్ చేయండి'],
    },
  },
  investment: {
    label: { en: 'Investment / trading fraud', hi: 'निवेश / ट्रेडिंग ठगी', te: 'పెట్టుబడి / ట్రేడింగ్ మోసం' },
    explanation: {
      en: 'This promises guaranteed or very high returns. No genuine investment can guarantee profit; these groups and apps show fake gains and then block withdrawals.',
      hi: 'यह गारंटीड या बहुत ऊँचे मुनाफ़े का वादा कर रहा है। कोई भी असली निवेश मुनाफ़े की गारंटी नहीं दे सकता; ऐसे ग्रुप और ऐप नकली मुनाफ़ा दिखाते हैं और फिर पैसे निकालने नहीं देते।',
      te: 'ఇది గ్యారెంటీ లేదా చాలా ఎక్కువ లాభాలు ఇస్తామని చెబుతోంది. నిజమైన పెట్టుబడి ఏదీ లాభానికి గ్యారెంటీ ఇవ్వదు; ఇలాంటి గ్రూపులు, యాప్‌లు నకిలీ లాభాలు చూపించి, తర్వాత డబ్బు తీసుకోనివ్వవు.',
    },
    voice: {
      en: 'Be careful. Guaranteed profit is always a scam. Do not send money to this group or app.',
      hi: 'सावधान रहिए। गारंटीड मुनाफ़ा हमेशा ठगी होता है। इस ग्रुप या ऐप में पैसे मत भेजिए।',
      te: 'జాగ్రత్త. గ్యారెంటీ లాభం అనేది ఎప్పుడూ మోసమే. ఈ గ్రూప్ లేదా యాప్‌కు డబ్బు పంపకండి.',
    },
    advice: {
      en: ['Do not invest through WhatsApp or Telegram groups', 'Check the adviser on sebi.gov.in', 'Talk to your family first'],
      hi: ['WhatsApp या Telegram ग्रुप के ज़रिए निवेश न करें', 'सलाहकार को sebi.gov.in पर जाँचें', 'पहले परिवार से बात करें'],
      te: ['WhatsApp లేదా Telegram గ్రూపుల ద్వారా పెట్టుబడి పెట్టకండి', 'సలహాదారుని sebi.gov.in లో తనిఖీ చేయండి', 'ముందు మీ కుటుంబంతో మాట్లాడండి'],
    },
  },
  electricity: {
    label: { en: 'Electricity disconnection scam', hi: 'बिजली कटने की ठगी', te: 'కరెంట్ కట్ మోసం' },
    explanation: {
      en: 'This threatens to cut your power tonight unless you call a number or pay. The electricity board never sends such messages from a mobile number.',
      hi: 'यह धमकी दे रहा है कि नंबर पर कॉल या भुगतान न करने पर आज रात बिजली काट दी जाएगी। बिजली विभाग कभी मोबाइल नंबर से ऐसे संदेश नहीं भेजता।',
      te: 'ఒక నంబర్‌కు కాల్ చేయకపోతే లేదా డబ్బు కట్టకపోతే ఈ రాత్రి కరెంట్ కట్ చేస్తామని ఇది బెదిరిస్తోంది. విద్యుత్ శాఖ మొబైల్ నంబర్ నుండి ఇలాంటి మెసేజ్‌లు ఎప్పుడూ పంపదు.',
    },
    voice: {
      en: 'This is a scam. The electricity board will not cut your power over a message. Do not call that number.',
      hi: 'यह ठगी है। बिजली विभाग संदेश भेजकर बिजली नहीं काटता। उस नंबर पर कॉल मत कीजिए।',
      te: 'ఇది మోసం. విద్యుత్ శాఖ మెసేజ్ పంపి కరెంట్ కట్ చేయదు. ఆ నంబర్‌కు కాల్ చేయకండి.',
    },
    advice: {
      en: ['Do not call the number in the message', 'Check your bill in the official app or call 1912', 'Never install any app they suggest'],
      hi: ['संदेश में दिए नंबर पर कॉल न करें', 'अपना बिल आधिकारिक ऐप में देखें या 1912 पर कॉल करें', 'उनका बताया कोई ऐप इंस्टॉल न करें'],
      te: ['మెసేజ్‌లోని నంబర్‌కు కాల్ చేయకండి', 'మీ బిల్లును అధికారిక యాప్‌లో చూడండి లేదా 1912కి కాల్ చేయండి', 'వారు చెప్పిన ఏ యాప్‌నూ ఇన్‌స్టాల్ చేయకండి'],
    },
  },
  courier: {
    label: { en: 'Courier / parcel scam', hi: 'कूरियर / पार्सल ठगी', te: 'కొరియర్ / పార్సిల్ మోసం' },
    explanation: {
      en: 'This claims a parcel in your name is stuck or contains illegal items. It is a hook to collect a fee or connect you to a fake police officer.',
      hi: 'यह कह रहा है कि आपके नाम का पार्सल रुका है या उसमें गैरकानूनी सामान है। यह फ़ीस वसूलने या नकली पुलिस अधिकारी से जोड़ने का जाल है।',
      te: 'మీ పేరు మీద ఉన్న పార్సిల్ ఆగిపోయిందని లేదా అందులో చట్టవిరుద్ధ వస్తువులు ఉన్నాయని ఇది చెబుతోంది. ఫీజు వసూలు చేయడానికి లేదా నకిలీ పోలీస్ అధికారితో కలపడానికి ఇది ఒక ఎర.',
    },
    voice: {
      en: 'This is a scam. No courier company calls about illegal parcels. Do not pay and do not press any number.',
      hi: 'यह ठगी है। कोई कूरियर कंपनी गैरकानूनी पार्सल के बारे में कॉल नहीं करती। पैसे न दें और कोई बटन न दबाएं।',
      te: 'ఇది మోసం. ఏ కొరియర్ కంపెనీ చట్టవిరుద్ధ పార్సిల్ గురించి కాల్ చేయదు. డబ్బు కట్టకండి, ఏ నంబర్ నొక్కకండి.',
    },
    advice: {
      en: ['Do not open the link or pay any fee', "Track parcels only on the courier's official website", 'Call 1930 if they threaten you'],
      hi: ['लिंक न खोलें, कोई फ़ीस न दें', 'पार्सल केवल कूरियर की आधिकारिक वेबसाइट पर ट्रैक करें', 'धमकी मिले तो 1930 पर कॉल करें'],
      te: ['లింక్ తెరవకండి, ఏ ఫీజూ కట్టకండి', 'పార్సిల్‌ను కొరియర్ అధికారిక వెబ్‌సైట్‌లో మాత్రమే ట్రాక్ చేయండి', 'బెదిరిస్తే 1930కి కాల్ చేయండి'],
    },
  },
  lottery: {
    label: { en: 'Lottery / prize scam', hi: 'लॉटरी / इनाम ठगी', te: 'లాటరీ / బహుమతి మోసం' },
    explanation: {
      en: 'You cannot win a lottery you never entered. They will ask for a "processing fee" or tax first and then disappear.',
      hi: 'जिस लॉटरी में आपने भाग ही नहीं लिया, उसे आप जीत नहीं सकते। ये पहले "प्रोसेसिंग फ़ीस" या टैक्स माँगेंगे और फिर गायब हो जाएंगे।',
      te: 'మీరు పాల్గొనని లాటరీని మీరు గెలవలేరు. వీరు ముందు "ప్రాసెసింగ్ ఫీజు" లేదా పన్ను అడిగి, తర్వాత మాయమవుతారు.',
    },
    voice: {
      en: 'This is a scam. There is no prize. Do not pay any fee.',
      hi: 'यह ठगी है। कोई इनाम नहीं है। कोई फ़ीस मत दीजिए।',
      te: 'ఇది మోసం. ఏ బహుమతీ లేదు. ఏ ఫీజూ కట్టకండి.',
    },
    advice: {
      en: ['Do not pay any fee or tax', 'Do not share bank details', 'Block the number'],
      hi: ['कोई फ़ीस या टैक्स न दें', 'बैंक की जानकारी न दें', 'नंबर ब्लॉक करें'],
      te: ['ఏ ఫీజూ, పన్నూ కట్టకండి', 'బ్యాంక్ వివరాలు చెప్పకండి', 'నంబర్‌ను బ్లాక్ చేయండి'],
    },
  },
  job_task: {
    label: { en: 'Fake job / task scam', hi: 'नकली नौकरी / टास्क ठगी', te: 'నకిలీ ఉద్యోగం / టాస్క్ మోసం' },
    explanation: {
      en: 'This offers easy money for simple tasks like liking videos. After small payouts they ask you to deposit money, which you never get back.',
      hi: 'यह वीडियो लाइक करने जैसे आसान कामों के लिए पैसे का लालच देता है। थोड़े पैसे देने के बाद ये आपसे पैसे जमा करवाते हैं, जो कभी वापस नहीं मिलते।',
      te: 'వీడియోలు లైక్ చేయడం వంటి సులభమైన పనులకు డబ్బు ఇస్తామని ఇది ఆశ చూపుతోంది. కొద్దిగా డబ్బు ఇచ్చాక, మీతో డబ్బు డిపాజిట్ చేయిస్తారు; అది ఎప్పటికీ తిరిగి రాదు.',
    },
    voice: {
      en: 'Be careful. A real job never asks you to pay money first.',
      hi: 'सावधान। असली नौकरी कभी पहले पैसे नहीं माँगती।',
      te: 'జాగ్రత్త. నిజమైన ఉద్యోగం ముందుగా డబ్బు కట్టమని ఎప్పుడూ అడగదు.',
    },
    advice: {
      en: ['Never pay to get a job or a task', 'Do not join unknown Telegram groups', 'Block and report the number'],
      hi: ['नौकरी या टास्क के लिए कभी पैसे न दें', 'अनजान Telegram ग्रुप में शामिल न हों', 'नंबर ब्लॉक करके रिपोर्ट करें'],
      te: ['ఉద్యోగం లేదా టాస్క్ కోసం ఎప్పుడూ డబ్బు కట్టకండి', 'తెలియని Telegram గ్రూపుల్లో చేరకండి', 'నంబర్‌ను బ్లాక్ చేసి రిపోర్ట్ చేయండి'],
    },
  },
  upi_collect: {
    label: { en: 'UPI "receive money" trick', hi: 'UPI "पैसे पाने" की चाल', te: 'UPI "డబ్బు అందుకునే" మోసం' },
    explanation: {
      en: 'To receive money you never scan a QR code or enter your UPI PIN. Entering the PIN always sends money out of your account.',
      hi: 'पैसे पाने के लिए कभी QR स्कैन नहीं करना पड़ता, न UPI पिन डालना पड़ता है। पिन डालने से हमेशा पैसे आपके खाते से जाते हैं।',
      te: 'డబ్బు అందుకోవడానికి QR స్కాన్ చేయడం లేదా UPI పిన్ ఎంటర్ చేయడం ఎప్పుడూ అవసరం లేదు. పిన్ ఎంటర్ చేస్తే మీ ఖాతా నుండి డబ్బు పోతుంది.',
    },
    voice: {
      en: 'Stop. Do not enter your UPI PIN. You never need a PIN to receive money.',
      hi: 'रुकिए। UPI पिन मत डालिए। पैसे पाने के लिए पिन की ज़रूरत कभी नहीं होती।',
      te: 'ఆగండి. UPI పిన్ ఎంటర్ చేయకండి. డబ్బు అందుకోవడానికి పిన్ ఎప్పుడూ అవసరం లేదు.',
    },
    advice: {
      en: ['Do not scan the QR code', 'Decline the request in your UPI app', 'The PIN is only for paying, never for receiving'],
      hi: ['QR कोड स्कैन न करें', 'अपने UPI ऐप में रिक्वेस्ट अस्वीकार करें', 'पिन केवल भुगतान के लिए है, पैसे पाने के लिए नहीं'],
      te: ['QR కోడ్ స్కాన్ చేయకండి', 'మీ UPI యాప్‌లో రిక్వెస్ట్‌ను తిరస్కరించండి', 'పిన్ చెల్లించడానికి మాత్రమే, అందుకోవడానికి కాదు'],
    },
  },
  malware_apk: {
    label: { en: 'Dangerous app file (APK)', hi: 'खतरनाक ऐप फ़ाइल (APK)', te: 'ప్రమాదకర యాప్ ఫైల్ (APK)' },
    explanation: {
      en: 'This asks you to install an app file sent in a message. Such files can read your SMS and OTPs and empty your bank account.',
      hi: 'यह संदेश में भेजी गई ऐप फ़ाइल इंस्टॉल करने को कह रहा है। ऐसी फ़ाइलें आपके SMS और OTP पढ़कर बैंक खाता खाली कर सकती हैं।',
      te: 'మెసేజ్‌లో పంపిన యాప్ ఫైల్‌ను ఇన్‌స్టాల్ చేయమని ఇది అడుగుతోంది. ఇలాంటి ఫైల్‌లు మీ SMS, OTPలను చదివి, మీ బ్యాంక్ ఖాతాను ఖాళీ చేయగలవు.',
    },
    voice: {
      en: 'Danger. Do not install this file. It can steal money from your bank account.',
      hi: 'खतरा। यह फ़ाइल इंस्टॉल मत कीजिए। यह आपके बैंक खाते से पैसे चुरा सकती है।',
      te: 'ప్రమాదం. ఈ ఫైల్‌ను ఇన్‌స్టాల్ చేయకండి. ఇది మీ బ్యాంక్ ఖాతా నుండి డబ్బు దొంగిలించగలదు.',
    },
    advice: {
      en: ['Do not download or open the file', 'Install apps only from the Play Store', 'If already installed, switch on flight mode and call your family'],
      hi: ['फ़ाइल डाउनलोड या ओपन न करें', 'ऐप केवल Play Store से इंस्टॉल करें', 'अगर इंस्टॉल हो चुकी है, तो फ़्लाइट मोड चालू करें और परिवार को कॉल करें'],
      te: ['ఫైల్‌ను డౌన్‌లోడ్ చేయకండి, తెరవకండి', 'యాప్‌లను Play Store నుండి మాత్రమే ఇన్‌స్టాల్ చేయండి', 'ఇప్పటికే ఇన్‌స్టాల్ చేసి ఉంటే, ఫ్లైట్ మోడ్ ఆన్ చేసి కుటుంబానికి కాల్ చేయండి'],
    },
  },
  remote_access: {
    label: { en: 'Screen-sharing scam', hi: 'स्क्रीन शेयरिंग ठगी', te: 'స్క్రీన్ షేరింగ్ మోసం' },
    explanation: {
      en: 'They want you to share your screen or install a remote-control app. Then they can see every OTP and operate your bank app themselves.',
      hi: 'ये चाहते हैं कि आप स्क्रीन शेयर करें या रिमोट-कंट्रोल ऐप इंस्टॉल करें। फिर ये हर OTP देख सकते हैं और खुद आपका बैंक ऐप चला सकते हैं।',
      te: 'మీరు స్క్రీన్ షేర్ చేయాలని లేదా రిమోట్ కంట్రోల్ యాప్ ఇన్‌స్టాల్ చేయాలని వీరు కోరుతున్నారు. అప్పుడు వారు ప్రతి OTPని చూడగలరు, మీ బ్యాంక్ యాప్‌ను వారే నడపగలరు.',
    },
    voice: {
      en: 'Danger. Do not share your screen and do not install any app. Cut the call now.',
      hi: 'खतरा। स्क्रीन शेयर मत कीजिए और कोई ऐप इंस्टॉल मत कीजिए। अभी कॉल काट दीजिए।',
      te: 'ప్రమాదం. స్క్రీన్ షేర్ చేయకండి, ఏ యాప్‌నూ ఇన్‌స్టాల్ చేయకండి. ఇప్పుడే కాల్ కట్ చేయండి.',
    },
    advice: {
      en: ['Cut the call', 'Do not install AnyDesk or TeamViewer', 'If installed, uninstall it and call your bank'],
      hi: ['कॉल काट दें', 'AnyDesk या TeamViewer इंस्टॉल न करें', 'अगर इंस्टॉल है, तो उसे हटाएं और बैंक को कॉल करें'],
      te: ['కాల్ కట్ చేయండి', 'AnyDesk లేదా TeamViewer ఇన్‌స్టాల్ చేయకండి', 'ఇన్‌స్టాల్ చేసి ఉంటే, తీసేసి మీ బ్యాంక్‌కు కాల్ చేయండి'],
    },
  },
  family_emergency: {
    label: { en: 'Fake relative in trouble', hi: 'मुसीबत में फँसा नकली रिश्तेदार', te: 'కష్టాల్లో ఉన్నట్టు నటించే నకిలీ బంధువు' },
    explanation: {
      en: 'Someone on a new number says they are your relative and need money urgently. Scammers copy names, photos and even voices.',
      hi: 'कोई नए नंबर से खुद को आपका रिश्तेदार बताकर तुरंत पैसे माँग रहा है। ठग नाम, फ़ोटो और यहाँ तक कि आवाज़ की भी नकल कर लेते हैं।',
      te: 'కొత్త నంబర్ నుండి ఎవరో మీ బంధువునని చెప్పి, అత్యవసరంగా డబ్బు అడుగుతున్నారు. మోసగాళ్లు పేర్లు, ఫోటోలు, చివరికి గొంతును కూడా అనుకరిస్తారు.',
    },
    voice: {
      en: 'Wait. Ask for the family safe word, or call your relative on their old number first.',
      hi: 'रुकिए। पारिवारिक सेफ़-वर्ड पूछिए, या पहले अपने रिश्तेदार को उसके पुराने नंबर पर कॉल कीजिए।',
      te: 'ఆగండి. కుటుంబ సేఫ్ వర్డ్ అడగండి, లేదా ముందు మీ బంధువు పాత నంబర్‌కు కాల్ చేయండి.',
    },
    advice: {
      en: ['Ask for the family safe word', 'Call your relative on the number you already have', 'Do not send money until you have spoken to them'],
      hi: ['पारिवारिक सेफ़-वर्ड पूछें', 'रिश्तेदार को उस नंबर पर कॉल करें जो आपके पास पहले से है', 'उनसे बात किए बिना पैसे न भेजें'],
      te: ['కుటుంబ సేఫ్ వర్డ్ అడగండి', 'మీ దగ్గర ఇప్పటికే ఉన్న నంబర్‌కు బంధువుకు కాల్ చేయండి', 'వారితో మాట్లాడే వరకు డబ్బు పంపకండి'],
    },
  },
  sim_block: {
    label: { en: 'SIM / number blocking scam', hi: 'सिम / नंबर बंद होने की ठगी', te: 'సిమ్ / నంబర్ బ్లాక్ మోసం' },
    explanation: {
      en: 'This says your mobile number or SIM will be blocked. TRAI and telecom companies never call or message to disconnect a number.',
      hi: 'यह कह रहा है कि आपका मोबाइल नंबर या सिम बंद हो जाएगा। TRAI और टेलीकॉम कंपनियाँ नंबर बंद करने के लिए कभी कॉल या संदेश नहीं करतीं।',
      te: 'మీ మొబైల్ నంబర్ లేదా సిమ్ బ్లాక్ అవుతుందని ఇది చెబుతోంది. నంబర్‌ను డిస్‌కనెక్ట్ చేయడానికి TRAI, టెలికాం కంపెనీలు ఎప్పుడూ కాల్ లేదా మెసేజ్ చేయవు.',
    },
    voice: {
      en: 'This is a scam. TRAI never calls to block your number. Do not press any key.',
      hi: 'यह ठगी है। TRAI कभी आपका नंबर बंद करने के लिए कॉल नहीं करता। कोई बटन मत दबाइए।',
      te: 'ఇది మోసం. మీ నంబర్‌ను బ్లాక్ చేయడానికి TRAI ఎప్పుడూ కాల్ చేయదు. ఏ బటన్ నొక్కకండి.',
    },
    advice: {
      en: ['Do not press any number or share your Aadhaar', 'Cut the call', 'Report it on Sanchar Saathi (Chakshu)'],
      hi: ['कोई नंबर न दबाएं, आधार न बताएं', 'कॉल काट दें', 'संचार साथी (चक्षु) पर रिपोर्ट करें'],
      te: ['ఏ నంబర్ నొక్కకండి, ఆధార్ చెప్పకండి', 'కాల్ కట్ చేయండి', 'సంచార్ సాథీ (చక్షు)లో రిపోర్ట్ చేయండి'],
    },
  },
  phishing_link: {
    label: { en: 'Dangerous link', hi: 'खतरनाक लिंक', te: 'ప్రమాదకర లింక్' },
    explanation: {
      en: 'The link in this message does not lead where it claims. It is built to steal your login, card details or OTP.',
      hi: 'इस संदेश का लिंक वहाँ नहीं ले जाता जहाँ का दावा करता है। यह आपका लॉगिन, कार्ड की जानकारी या OTP चुराने के लिए बना है।',
      te: 'ఈ సందేశంలోని లింక్ అది చెప్పిన చోటుకు తీసుకెళ్లదు. మీ లాగిన్, కార్డ్ వివరాలు లేదా OTPని దొంగిలించడానికి ఇది తయారు చేయబడింది.',
    },
    voice: {
      en: 'Do not open this link. It is a fake website.',
      hi: 'यह लिंक मत खोलिए। यह नकली वेबसाइट है।',
      te: 'ఈ లింక్ తెరవకండి. ఇది నకిలీ వెబ్‌సైట్.',
    },
    advice: {
      en: ['Do not open the link', 'Type the official website address yourself', 'Never enter OTP or card details on a link from a message'],
      hi: ['लिंक न खोलें', 'आधिकारिक वेबसाइट का पता खुद टाइप करें', 'संदेश के लिंक पर कभी OTP या कार्ड की जानकारी न डालें'],
      te: ['లింక్ తెరవకండి', 'అధికారిక వెబ్‌సైట్ చిరునామాను మీరే టైప్ చేయండి', 'మెసేజ్‌లోని లింక్‌లో OTP లేదా కార్డ్ వివరాలు ఎప్పుడూ ఎంటర్ చేయకండి'],
    },
  },
  unknown: {
    label: { en: 'Suspicious message', hi: 'संदिग्ध संदेश', te: 'అనుమానాస్పద సందేశం' },
    explanation: {
      en: 'This message shows warning signs of fraud. Do not act on it until you have checked with your family.',
      hi: 'इस संदेश में ठगी के संकेत हैं। परिवार से पूछे बिना इस पर कोई कदम न उठाएं।',
      te: 'ఈ సందేశంలో మోసానికి సంబంధించిన హెచ్చరిక సంకేతాలు ఉన్నాయి. మీ కుటుంబాన్ని అడగకుండా దీనిపై ఏ చర్యా తీసుకోకండి.',
    },
    voice: {
      en: 'Be careful. This looks like a scam. Do not send money or share any code.',
      hi: 'सावधान रहिए। यह ठगी लग रही है। पैसे मत भेजिए और कोई कोड मत बताइए।',
      te: 'జాగ్రత్త. ఇది మోసంలా ఉంది. డబ్బు పంపకండి, ఏ కోడ్ చెప్పకండి.',
    },
    advice: {
      en: ['Do not reply or click anything', 'Ask your family', 'Call 1930 if money was sent'],
      hi: ['जवाब न दें, कुछ भी क्लिक न करें', 'परिवार से पूछें', 'पैसे चले गए हों तो 1930 पर कॉल करें'],
      te: ['రిప్లై ఇవ్వకండి, దేన్నీ క్లిక్ చేయకండి', 'మీ కుటుంబాన్ని అడగండి', 'డబ్బు పంపి ఉంటే 1930కి కాల్ చేయండి'],
    },
  },
};

export const SAFE_INFO = {
  explanation: {
    en: 'Satark found no signs of fraud in this. Still, never share an OTP or PIN with anyone.',
    hi: 'सतर्क को इसमें ठगी का कोई संकेत नहीं मिला। फिर भी, OTP या पिन कभी किसी को न बताएं।',
    te: 'సతర్క్‌కు ఇందులో మోసానికి సంబంధించిన సంకేతాలు ఏవీ కనిపించలేదు. అయినా, OTP లేదా పిన్ ఎవరికీ చెప్పకండి.',
  } satisfies Localized,
  voice: {
    en: 'This looks safe.',
    hi: 'यह सुरक्षित लग रहा है।',
    te: 'ఇది సురక్షితంగా ఉంది.',
  } satisfies Localized,
};

/** One-sentence warning in every supported language, for voice when no translation exists yet. */
export const GENERIC_WARNING: Record<LangCode, string> = {
  te: 'ఇది మోసం. డబ్బు పంపకండి. మీ కుటుంబ సభ్యులకు చెప్పండి.',
  hi: 'यह ठगी है। पैसे मत भेजिए। अपने परिवार को बताइए।',
  en: 'This is a scam. Do not send money. Tell your family.',
  ta: 'இது மோசடி. பணம் அனுப்பாதீர்கள். உங்கள் குடும்பத்தினரிடம் சொல்லுங்கள்.',
  kn: 'ಇದು ವಂಚನೆ. ಹಣ ಕಳುಹಿಸಬೇಡಿ. ನಿಮ್ಮ ಕುಟುಂಬದವರಿಗೆ ತಿಳಿಸಿ.',
  ml: 'ഇത് തട്ടിപ്പാണ്. പണം അയയ്ക്കരുത്. നിങ്ങളുടെ കുടുംബത്തോട് പറയൂ.',
  mr: 'ही फसवणूक आहे. पैसे पाठवू नका. तुमच्या कुटुंबाला सांगा.',
  bn: 'এটি প্রতারণা। টাকা পাঠাবেন না। আপনার পরিবারকে জানান।',
  gu: 'આ છેતરપિંડી છે. પૈસા મોકલશો નહીં. તમારા પરિવારને જણાવો.',
  pa: 'ਇਹ ਧੋਖਾ ਹੈ। ਪੈਸੇ ਨਾ ਭੇਜੋ। ਆਪਣੇ ਪਰਿਵਾਰ ਨੂੰ ਦੱਸੋ।',
  or: 'ଏହା ଠକେଇ। ଟଙ୍କା ପଠାନ୍ତୁ ନାହିଁ। ଆପଣଙ୍କ ପରିବାରକୁ କୁହନ୍ତୁ।',
};

/** The line Satark speaks for a verdict, in the user's language. */
export function voiceLineFor(verdict: Verdict, scamType: ScamType, lang: LangCode): string {
  if (verdict === 'safe') return (SAFE_INFO.voice as Record<string, string>)[lang] ?? SAFE_INFO.voice.en;
  const voice = SCAM_TYPES[scamType].voice as Record<string, string | undefined>;
  return voice[lang] ?? GENERIC_WARNING[lang] ?? voice.en!;
}
