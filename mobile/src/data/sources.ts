import type { Localized } from '@satark/shared';

/**
 * Every figure shown in the app is sourced. These are the same sources cited in
 * the README; nothing here is invented.
 */
export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
}

export const SOURCES: Source[] = [
  { id: 'tt-fir', title: 'Telangana tops India in cybercrime FIRs, ₹1,524 crore lost in 2025', publisher: 'Telangana Today', url: 'https://telanganatoday.com/telangana-tops-india-in-cybercrime-firs-despite-rs-1524-crore-fraud-losses-in-2025' },
  { id: 'uni-seniors', title: 'Senior citizens lose ₹102 crore to cyber fraud in Hyderabad in 19 months', publisher: 'UNI', url: 'https://test.uniindia.com/seniro-citizens-lose-rs-102-cr-to-cyber-fruad-in-hyderabad-in-19-months/south/news/3938099.html' },
  { id: 'dc-invest', title: 'Investment frauds account for 60% of Telangana cybercrime losses', publisher: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/amp/southern-states/telangana/investment-frauds-account-for-60-of-telangana-cybercrime-losses-1979308' },
  { id: 'fpj-national', title: 'Over 24 lakh cyber complaints, ₹22,495 crore fraud reported in 2025', publisher: 'Free Press Journal', url: 'https://www.freepressjournal.in/amp/mumbai/over-24-lakh-cyber-complaints-22495-crore-fraud-reported-in-2025' },
  { id: 'asianet-seniors', title: 'Senior citizens and women lost ₹7,769 crore to cyber fraud in 2025', publisher: 'Asianet Newsable', url: 'https://newsable.asianetnews.com/india/senior-citizens-women-lost-rs-7-769-crore-to-cyber-fraud-in-2025-articleshow-u9oad8w' },
  { id: 'sc-arrest', title: 'Supreme Court: digital arrests a very big challenge; victims mostly elderly lost ₹3,000 crore', publisher: 'The Hindu (via SuperKalam)', url: 'https://superkalam.com/current-affairs/04-11-2025/digital-arrests-are-a-very-big-challenge-victims-mostly-elderly-lost-3-000-cr-in-india-alone-sc-pg14-e9a40d2b-a355-49c7-ae2f-a819ae7fb574' },
  { id: 'trai-suffix', title: "TRAI's SMS sender suffix format explained", publisher: 'Storyboard18', url: 'https://www.storyboard18.com/how-it-works/why-your-sms-now-looks-like-a-code-trais-new-message-format-explained-70270.htm' },
  { id: 'rbi-1600', title: 'RBI asks banks to use only 1600xx numbers for transactional calls', publisher: 'Outlook Money', url: 'https://www.outlookmoney.com/banking/rbi-asks-banks-to-use-only-1600xx-series-phone-numbers-to-call-customers-for-transactional-purposes' },
  { id: 'ezero', title: 'Government launches e-Zero FIR to auto-convert cybercrime complaints into FIRs', publisher: 'Outlook Money', url: 'https://www.outlookmoney.com/news/govt-launches-e-zero-to-auto-convert-cybercrime-complaints-into-firs-speed-up-investigations' },
  { id: 'cybercrime', title: 'National Cyber Crime Reporting Portal', publisher: 'Ministry of Home Affairs (I4C)', url: 'https://cybercrime.gov.in' },
];

export interface Stat {
  value: string;
  label: Localized;
  scope: string;
  sourceId: string;
}

export const STATS: Stat[] = [
  {
    value: '₹102 crore',
    label: { en: 'lost by senior citizens in 403 cases', hi: '403 मामलों में बुज़ुर्गों ने गँवाए', te: '403 కేసుల్లో వృద్ధులు కోల్పోయారు' },
    scope: 'Hyderabad, Jan 2025 – Jul 2026',
    sourceId: 'uni-seniors',
  },
  {
    value: '21,639',
    label: { en: 'cybercrime FIRs, about 44% of all India', hi: 'साइबर अपराध FIR, पूरे भारत की लगभग 44%', te: 'సైబర్ నేరాల FIRలు, దేశం మొత్తంలో సుమారు 44%' },
    scope: 'Telangana, 2025',
    sourceId: 'tt-fir',
  },
  {
    value: '₹1,524 crore',
    label: { en: 'lost to cyber fraud', hi: 'साइबर ठगी में गँवाए', te: 'సైబర్ మోసాల్లో కోల్పోయారు' },
    scope: 'Telangana, 2025',
    sourceId: 'tt-fir',
  },
  {
    value: '₹4,005 crore',
    label: { en: 'lost by senior citizens across 1,03,488 complaints', hi: '1,03,488 शिकायतों में बुज़ुर्गों ने गँवाए', te: '1,03,488 ఫిర్యాదుల్లో వృద్ధులు కోల్పోయారు' },
    scope: 'India, 2025',
    sourceId: 'asianet-seniors',
  },
  {
    value: '~₹3,000 crore',
    label: { en: 'lost to "digital arrest", victims mostly elderly', hi: '"डिजिटल अरेस्ट" में गँवाए, ज़्यादातर पीड़ित बुज़ुर्ग', te: '"డిజిటల్ అరెస్ట్"లో కోల్పోయారు, బాధితుల్లో ఎక్కువ మంది వృద్ధులు' },
    scope: 'India, per the Supreme Court, Nov 2025',
    sourceId: 'sc-arrest',
  },
  {
    value: '~60%',
    label: { en: 'of losses come from investment frauds', hi: 'नुकसान निवेश ठगी से होता है', te: 'నష్టాలు పెట్టుబడి మోసాల వల్లే' },
    scope: 'Telangana',
    sourceId: 'dc-invest',
  },
];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);
