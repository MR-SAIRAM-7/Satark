# Twilio setup

Satark uses Twilio for three things:

| Use | Twilio product | Backend code |
|---|---|---|
| Complaint Kit and FIR status updates to the elder and guardian | WhatsApp (Sandbox during the hackathon) | `services/notify.ts` |
| "Forward to Satark" bot: forward a suspicious message, get a verdict back | WhatsApp inbound webhook | `routes/whatsapp.ts` → `POST /v1/whatsapp/inbound` |
| Delivery receipts (delivered, read, or why it failed) | WhatsApp status callback | `routes/whatsapp.ts` → `POST /v1/whatsapp/status` |
| Real sign-in codes, only when `DEMO_MODE=false` | Verify | `routes/auth.ts` |

Without credentials everything still works: messages are recorded in the dashboard outbox with status "Demo" and nothing leaves the server.

## 1. Credentials

1. Sign in at <https://console.twilio.com>.
2. On the console home page, under **Account Info**, copy the **Account SID** and **Auth Token**.
3. Paste them into `backend/.env`:

   ```ini
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=+14155238886
   ```

`backend/.env` is git-ignored. Never paste the Auth Token into chat, a commit or the mobile app.

## 2. Give the API a public address

Twilio calls the API from the internet and downloads the Complaint Kit PDF from it, so `http://localhost:8000` is not enough. Deploy the backend (Render, using `backend/Dockerfile`) or open a tunnel to port 8000, then set the https address:

```ini
PUBLIC_BASE_URL=https://your-api.example.com
```

It must match the address in the Twilio console exactly: Twilio signs each webhook with the URL it called, and the API rejects a signature that does not match (HTTP 403).

Until this is set, outbound messages still go out as text, without the PDF, and the bot and delivery receipts stay off.

## 3. WhatsApp Sandbox

In the Twilio console: **Messaging → Try it out → Send a WhatsApp message**.

1. Accept the Sandbox terms. Note your **join code** (two words, e.g. `join silver-tiger`).
2. On the elder phone and the guardian phone, send that `join ...` message on WhatsApp to **+1 415 523 8886**. The Sandbox replies to confirm.
3. Open the **Sandbox settings** tab and set:

   | Field | Value | Method |
   |---|---|---|
   | When a message comes in | `https://<PUBLIC_BASE_URL>/v1/whatsapp/inbound` | POST |
   | Status callback URL | `https://<PUBLIC_BASE_URL>/v1/whatsapp/status` | POST |

4. Save.

`GET /health` on the API prints both URLs under `twilio.webhooks` once `PUBLIC_BASE_URL` is public.

## 4. Verify (optional)

Only needed to send real sign-in codes. In demo mode the code is `DEMO_OTP`.

1. Console → **Verify → Services → Create new**. Name it `Satark`, enable the SMS channel.
2. Copy the Service SID (`VA...`) into `backend/.env` as `TWILIO_VERIFY_SERVICE_SID`.
3. A trial account can only send codes to numbers verified under **Phone Numbers → Verified Caller IDs**.

## 5. Check it

```bash
npm run twilio:check --workspace backend
```

```bash
npm run twilio:check --workspace backend -- --to +919876543210
```

The second form sends one real test message and waits for the receipt. It tells you in plain words what is wrong if it fails.

## Sandbox rules that bite during a demo

| Rule | What it means for the demo |
|---|---|
| Recipients must join first (error 63015) | Both demo phones send `join <code>` before the pitch. |
| Membership lasts 3 days | Rejoin from both phones the day before presenting. |
| Free-form messages only within 24 hours of the recipient's last message (error 63016) | Both phones send "Hi" to the Sandbox number on demo morning. Joining also opens the window. |
| One message every 3 seconds | The API queues Sandbox sends automatically; a burst of updates arrives a few seconds apart. |
| Trial accounts include about 100 WhatsApp messages | Enough for rehearsals and the pitch; do not leave the dashboard's live feed sending to real numbers. |
| The attachment link must be public (error 63019) | Set `PUBLIC_BASE_URL`, or configure S3, or the PDF is left off. |

Failures show in the dashboard under **Automated messages**, with the reason next to the message.

## Going beyond the Sandbox

A production sender needs a WhatsApp Business Account, an approved sender and approved message templates for anything sent outside the 24-hour window. That is out of scope for the hackathon; when you get there, change `TWILIO_WHATSAPP_FROM` and send the status updates with `contentSid` templates instead of free-form text.
