/**
 * HTML -> PDF with headless Chrome or Edge (puppeteer-core). A browser engine
 * shapes Telugu and Devanagari correctly, which most PDF libraries do not.
 * Returns null when no browser is installed; callers then keep the HTML kit.
 */
import { existsSync } from 'node:fs';

import puppeteer, { type Browser } from 'puppeteer-core';

import { env } from '../config/env';
import { logger } from '../lib/logger';

const CANDIDATES = [
  env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export const browserPath = CANDIDATES.find((p): p is string => Boolean(p && existsSync(p))) ?? null;

let browser: Promise<Browser> | null = null;

export async function htmlToPdf(html: string): Promise<Buffer | null> {
  if (!browserPath) return null;
  try {
    browser ??= puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const page = await (await browser).newPage();
    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
      return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
      await page.close();
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'PDF render failed; keeping the HTML kit');
    browser = null;
    return null;
  }
}

export async function closePdf(): Promise<void> {
  const current = browser;
  browser = null;
  await (await current?.catch(() => null))?.close();
}
