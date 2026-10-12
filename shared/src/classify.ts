/** Scam-type classification from signals: picks the explanation and voice warning. */
import { hasPhrase } from './match';
import type { Signals } from './signals';
import type { RuleHit, ScamType } from './types';

const TOPICS: { type: ScamType; phrases: string[] }[] = [
  {
    type: 'electricity',
    phrases: ['electricity', 'power supply', 'power will be', 'bijli', 'light bill', 'current bill', 'बिजली', 'విద్యుత్', 'కరెంట్'],
  },
  {
    type: 'sim_block',
    phrases: ['sim card', 'your sim', 'mobile number will be', 'number will be disconnected', 'trai', 'telecom department', 'e-sim', 'esim', 'सिम', 'సిమ్'],
  },
  {
    type: 'courier',
    phrases: ['parcel', 'courier', 'package', 'shipment', 'consignment', 'fedex', 'india post', 'speed post', 'delivery attempt', 'पार्सल', 'कूरियर', 'పార్సిల్', 'కొరియర్'],
  },
  {
    type: 'investment',
    phrases: ['trading', 'stock tips', 'share market', 'ipo', 'guaranteed returns', 'guaranteed profit', 'double your money', 'crypto', 'bitcoin', 'forex', 'investment', 'demat', 'multibagger', 'निवेश', 'शेयर बाजार', 'పెట్టుబడి', 'ట్రేడింగ్', 'షేర్ మార్కెట్'],
  },
  {
    type: 'job_task',
    phrases: ['part time job', 'part-time job', 'work from home', 'like videos', 'youtube like', 'telegram task', 'daily task', 'task complete', 'earn daily', 'hr manager', 'घर बैठे', 'ఇంటి నుండి'],
  },
  {
    type: 'lottery',
    phrases: ['lottery', 'lucky draw', 'lucky winner', 'kbc', 'prize', 'you have won', 'you won', 'लॉटरी', 'इनाम', 'లాటరీ', 'బహుమతి'],
  },
];

const ARREST_WORDS = [
  'arrest', 'warrant', 'money laundering', 'digital arrest', 'cbi', 'crime branch', 'narcotics',
  'enforcement directorate', 'fir', 'गिरफ्तार', 'गिरफ़्तार', 'वारंट', 'अरेस्ट', 'అరెస్ట్', 'వారెంట్',
];

export function classify(norm: string, s: Signals, hits: readonly RuleHit[]): ScamType {
  const fired = (id: string) => hits.some((h) => h.id === id);

  if (fired('R9')) return 'malware_apk';
  if (fired('R10')) return 'remote_access';
  if (fired('R7')) return 'upi_collect';
  if (s.authority && hasPhrase(norm, ARREST_WORDS)) return 'digital_arrest';
  if (fired('R16')) return 'family_emergency';

  const topic = TOPICS.find((t) => hasPhrase(norm, t.phrases));
  if (topic) return topic.type;

  if (s.bankClaim && (s.bankAction || s.secretAsk)) return 'kyc_bank';
  if (fired('R4') || fired('R6') || fired('R14')) return 'phishing_link';
  return 'unknown';
}
