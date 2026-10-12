/**
 * Checks the Twilio setup end to end and says what to fix.
 *
 *   npm run twilio:check --workspace backend
 *   npm run twilio:check --workspace backend -- --to +919876543210
 *
 * With --to it sends one real WhatsApp message and waits for the delivery
 * receipt. The number must have joined your Sandbox first. Secrets are never printed.
 */
import { env, features } from '../config/env';
import { explainTwilioError, SANDBOX_NUMBER, twilioClient, usingSandbox, webhooks, whatsappFrom } from '../lib/twilio';
import { normalizePhone } from '../lib/crypto';

const ok = (label: string, detail = '') => console.log(`  OK    ${label}${detail ? `  ${detail}` : ''}`);
const warn = (label: string, detail = '') => console.log(`  WARN  ${label}${detail ? `  ${detail}` : ''}`);
const fail = (label: string, detail = '') => console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toFlag = process.argv.indexOf('--to');
const to = toFlag > -1 ? process.argv[toFlag + 1] : undefined;

async function main(): Promise<number> {
  console.log('\nSatark - Twilio check\n');
  let problems = 0;

  // 1. Credentials present
  const sid = env.TWILIO_ACCOUNT_SID;
  if (!sid || !env.TWILIO_AUTH_TOKEN) {
    fail('Credentials', 'Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env (Twilio console > Account Info).');
    return 1;
  }
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) warn('Account SID', 'does not look like an Account SID (AC + 32 characters).');
  const client = twilioClient;
  if (!client) {
    fail('Sender', `Set TWILIO_WHATSAPP_FROM=${SANDBOX_NUMBER} (the Sandbox number) in backend/.env.`);
    return 1;
  }

  // 2. Credentials accepted
  try {
    const account = await client.api.v2010.accounts(sid).fetch();
    ok('Credentials', `account "${account.friendlyName}" (${account.type}, ${account.status}), SID ...${sid.slice(-4)}`);
    if (account.type === 'Trial') warn('Trial account', 'includes about 100 free WhatsApp messages; enough for a demo, not for load.');
  } catch (err) {
    const { code, message } = err as { code?: number; message?: string };
    fail('Credentials', explainTwilioError(code ?? 20003, message));
    return 1;
  }

  // 3. WhatsApp sender
  if (!features.whatsapp) {
    fail('WhatsApp sender', `Set TWILIO_WHATSAPP_FROM=${SANDBOX_NUMBER} in backend/.env.`);
    problems++;
  } else if (usingSandbox) {
    ok('WhatsApp sender', `${whatsappFrom} (Sandbox: recipients must send "join <code>" first, and rejoin every 3 days)`);
  } else {
    ok('WhatsApp sender', `${whatsappFrom} (registered sender)`);
  }

  // 4. Webhooks
  if (webhooks.inbound) {
    ok('Public URL', env.PUBLIC_BASE_URL);
    console.log('        Paste these into Twilio console > Messaging > Try it out > Send a WhatsApp message > Sandbox settings:');
    console.log(`          When a message comes in:  ${webhooks.inbound}   (POST)`);
    console.log(`          Status callback URL:      ${webhooks.status}   (POST)`);
  } else {
    warn('Public URL', `PUBLIC_BASE_URL is ${env.PUBLIC_BASE_URL}. Twilio cannot reach it, so:`);
    console.log('          - the "forward to Satark" bot and delivery receipts will not work;');
    console.log('          - messages are sent as text only, without the Complaint Kit PDF.');
    console.log('        Deploy the API or open a tunnel, then set PUBLIC_BASE_URL to its https address.');
    problems++;
  }

  // 5. Verify (sign-in codes)
  if (env.TWILIO_VERIFY_SERVICE_SID) {
    try {
      const service = await client.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID).fetch();
      ok('Verify service', `"${service.friendlyName}"${env.DEMO_MODE ? ' (unused while DEMO_MODE=true: the code is DEMO_OTP)' : ''}`);
    } catch (err) {
      fail('Verify service', explainTwilioError((err as { code?: number }).code, 'TWILIO_VERIFY_SERVICE_SID was not found in this account.'));
      problems++;
    }
  } else {
    warn('Verify service', 'TWILIO_VERIFY_SERVICE_SID is not set. Fine in demo mode; needed for real sign-in codes.');
  }

  // 6. A real message, if asked for
  if (to && features.whatsapp) {
    const number = normalizePhone(to);
    try {
      const sent = await client.messages.create({
        from: `whatsapp:${whatsappFrom}`,
        to: `whatsapp:${number}`,
        body: 'Satark test: WhatsApp delivery is working. This is a test message, not an alert.',
      });
      let status = sent.status as string;
      let errorCode: number | null = sent.errorCode ?? null;
      for (let i = 0; i < 8 && !['delivered', 'read', 'failed', 'undelivered'].includes(status); i++) {
        await sleep(1500);
        const latest = await client.messages(sent.sid).fetch();
        status = latest.status;
        errorCode = latest.errorCode ?? null;
      }
      if (status === 'failed' || status === 'undelivered') {
        fail(`Test message to ...${number.slice(-4)}`, explainTwilioError(errorCode));
        problems++;
      } else {
        ok(`Test message to ...${number.slice(-4)}`, `status: ${status}`);
      }
    } catch (err) {
      const { code, message } = err as { code?: number; message?: string };
      fail('Test message', explainTwilioError(code, message));
      problems++;
    }
  } else if (!to) {
    console.log('\n  Add  -- --to +91XXXXXXXXXX  to send a real test message to a phone that has joined the Sandbox.');
  }

  console.log(problems ? `\n${problems} thing(s) to fix.\n` : '\nTwilio is ready.\n');
  return problems ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
