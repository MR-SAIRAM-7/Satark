/**
 * HTML -> PDF with headless Chrome or Edge (puppeteer-core). A browser engine
 * shapes Telugu and Devanagari correctly, which most PDF libraries do not.
 *
 * Rendering is bounded: if no browser is installed, or it does not start or
 * render within RENDER_TIMEOUT_MS, this returns null and callers keep the HTML
 * kit. A slow PDF must never hold up filing a case.
 */
import { existsSync } from 'node:fs';

import puppeteer, { type Browser } from 'puppeteer-core';

import { env } from '../config/env';
import { logger } from '../lib/logger';

const RENDER_TIMEOUT_MS = 15_000;

// Forward slashes work on Windows too. On Linux, Google Chrome comes before
// chromium-browser, which on Ubuntu is often a stub that launches a snap.
const CANDIDATES = [
  env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export const browserPath = CANDIDATES.find((p): p is string => Boolean(p && existsSync(p))) ?? null;

let browser: Promise<Browser> | null = null;

function launch(): Promise<Browser> {
  browser ??= puppeteer.launch({
    executablePath: browserPath!,
    headless: true,
    timeout: RENDER_TIMEOUT_MS,
    // CI runners and containers: no sandbox, tiny /dev/shm, no GPU.
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run'],
  });
  return browser;
}

async function render(html: string): Promise<Buffer> {
  const page = await (await launch()).newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, timeout: RENDER_TIMEOUT_MS }));
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function htmlToPdf(html: string): Promise<Buffer | null> {
  if (!browserPath) return null;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), RENDER_TIMEOUT_MS);
  });
  const job = render(html);
  job.catch(() => undefined); // if the timeout wins, the abandoned render must not become an unhandled rejection
  try {
    const result = await Promise.race([job, timeout]);
    if (result === 'timeout') throw new Error(`no PDF within ${RENDER_TIMEOUT_MS / 1000} s`);
    return result;
  } catch (err) {
    logger.warn({ err: (err as Error).message, browserPath }, 'PDF render failed; keeping the HTML kit');
    await closePdf(); // start a fresh browser next time
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function closePdf(): Promise<void> {
  const current = browser;
  browser = null;
  await (await current?.catch(() => null))?.close().catch(() => undefined);
}
