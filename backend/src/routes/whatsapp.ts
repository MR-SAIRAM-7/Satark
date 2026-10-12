/**
 * "Forward to Satark" WhatsApp bot (Twilio webhook). Family members without
 * the app forward a suspicious message and get the verdict back in their
 * language; replying REPORT adds its identifiers to the community blocklist.
 */
import { SCAM_TYPES, type AnalyzeResponse, type Indicator, type ScamType } from '@satark/shared';
import { Router } from 'express';
import { LRUCache } from 'lru-cache';
import twilio from 'twilio';
import { z } from 'zod';

import { env } from '../config/env';
import { sha256 } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { analyzeMessage } from '../services/analysis';
import { reportIndicators, toReported } from '../services/intel';

export const whatsappRouter = Router();

type Lang = 'en' | 'te' | 'hi';
const lastForward = new LRUCache<string, { indicators: Indicator[]; scamType: ScamType }>({ max: 5000, ttl: 60 * 60 * 1000 });

const HEAD: Record<AnalyzeResponse['verdict'], Record<Lang, string>> = {
  scam: { en: '🔴 SCAM', te: '🔴 ఇది మోసం', hi: '🔴 यह ठगी है' },
  suspicious: { en: '🟠 SUSPICIOUS', te: '🟠 అనుమానాస్పదం', hi: '🟠 संदिग्ध' },
  safe: { en: '🟢 Looks safe', te: '🟢 సురక్షితంగా ఉంది', hi: '🟢 सुरक्षित लगता है' },
};
const FOOTER: Record<Lang, string> = {
  en: 'Reply REPORT to warn every Satark user. Lost money? Call 1930 now.',
  te: 'అందరినీ హెచ్చరించడానికి REPORT అని పంపండి. డబ్బు పోయిందా? వెంటనే 1930కి కాల్ చేయండి.',
  hi: 'सबको सावधान करने के लिए REPORT भेजें। पैसे गए? तुरंत 1930 पर कॉल करें।',
};

const langOf = (text: string): Lang => (/[ఀ-౿]/.test(text) ? 'te' : /[ऀ-ॿ]/.test(text) ? 'hi' : 'en');

export function formatReply(r: AnalyzeResponse, lang: Lang): string {
  const label = SCAM_TYPES[r.scam_type].label[lang];
  const advice = r.verdict === 'safe' ? [] : (lang === 'en' ? r.advice : (r.advice_l10n?.[lang] ?? r.advice)).slice(0, 3);
  return [
    `${HEAD[r.verdict][lang]} (${r.score}/100)${r.verdict === 'safe' ? '' : ` · ${label}`}`,
    '',
    r.explanation[lang] ?? r.explanation.en,
    ...(advice.length ? ['', ...advice.map((a) => `• ${a}`)] : []),
    ...(r.injection_attempt ? ['', '⚠️ This message also tries to trick AI filters.'] : []),
    '',
    FOOTER[lang],
  ].join('\n');
}

whatsappRouter.post('/whatsapp/inbound', async (req, res) => {
  if (env.TWILIO_AUTH_TOKEN) {
    const url = `${env.PUBLIC_BASE_URL}${req.originalUrl}`;
    if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, req.header('x-twilio-signature') ?? '', url, req.body)) {
      throw new HttpError(403, 'Invalid Twilio signature');
    }
  }
  const body = z.object({ From: z.string().min(3), Body: z.string().max(4000).default(''), NumMedia: z.string().optional() }).parse(req.body);
  const from = body.From.replace(/^whatsapp:/, '');
  const text = body.Body.trim();
  const lang = langOf(text);

  let reply: string;
  if (/^report$/i.test(text)) {
    const last = lastForward.get(from);
    if (last?.indicators.length) {
      await reportIndicators({ reporter: `wa:${sha256(from).slice(0, 16)}`, indicators: last.indicators.map(toReported), scamType: last.scamType, channel: 'whatsapp' });
      reply = `Thank you. ${last.indicators.length} number(s)/link(s) added to the Satark community blocklist.`;
    } else {
      reply = 'Forward the suspicious message first, then reply REPORT.';
    }
  } else if (!text) {
    reply = 'Please forward the message text. Screenshots are checked in the Satark app.';
  } else {
    const { response, local } = await analyzeMessage({ source: 'forward', text, lang, sender: null }, { channel: 'whatsapp' });
    lastForward.set(from, { indicators: local.indicators, scamType: response.scam_type });
    reply = formatReply(response, lang);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});
