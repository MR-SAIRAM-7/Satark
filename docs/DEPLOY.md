# Deploying the API on Render

The repository is set up so Render needs one value from you: a MongoDB Atlas connection string. Everything else is in [`render.yaml`](../render.yaml).

## 1. Database: MongoDB Atlas (5 minutes)

Render has no MongoDB, and the embedded database used on a laptop cannot run in a hosted container.

1. Create a free **M0** cluster at <https://www.mongodb.com/atlas>.
2. **Database Access**: add a user with a password.
3. **Network Access**: add `0.0.0.0/0` (Render's outbound addresses are not fixed on the free plan).
4. **Connect → Drivers**: copy the connection string and put a database name before the `?`:

   ```text
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/satark?retryWrites=true&w=majority
   ```

## 2. Create the service

1. Push the repository to GitHub (Render deploys from it).
2. In Render: **New → Blueprint**, choose the `Satark` repository.
3. Render reads `render.yaml` and asks for `MONGODB_URI`. Paste the Atlas string. Click **Apply**.

Render then builds `backend/Dockerfile` (Node 22 with Chromium for the PDF), generates `JWT_SECRET`, `HASH_SECRET` and `PHONE_ENC_KEY`, and starts the API. The first build takes several minutes.

When it is live, open `https://<your-service>.onrender.com/health`. You should see `"ok": true`, and under `twilio.webhooks` the two URLs to paste into the Twilio console.

## 3. Add the provider keys

Fill in [`backend/.env.render.example`](../backend/.env.render.example), delete the lines you leave empty, and paste it into **satark-api → Environment → Add from .env**. Saving redeploys the service.

| Key | Without it |
|---|---|
| `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SARVAM_API_KEY` | Verdicts come from the rules, classifier and community layers; explanations are the built-in ones |
| `SARVAM_API_KEY` | No Sarvam voice or translation; the phone's own voice is used |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | WhatsApp messages are recorded in the dashboard outbox, not sent |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Rule R6 is skipped |
| `AWS_*`, `S3_BUCKET` | PDFs live on the container's disk and are lost on restart |

Then finish Twilio with the URLs from `/health`: see [TWILIO.md](TWILIO.md).

## 4. Point the app and dashboard at it

- **App:** set `EXPO_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com/v1` in the `env` block of the build profile in `mobile/eas.json`, then build.
- **Dashboard:** set `NEXT_PUBLIC_API_BASE_URL` to the same URL where the dashboard is built. On Render, create a second web service from `dashboard/Dockerfile` (Docker context: repository root) with that variable; on Vercel, add it under Environment Variables.
- Once the dashboard has an address, replace `ALLOWED_ORIGINS=*` on the API with that address.

## What the settings in render.yaml mean

| Setting | Value | Why |
|---|---|---|
| `PUBLIC_BASE_URL` | not set | The API uses Render's `RENDER_EXTERNAL_URL`, so webhook signatures and PDF links always match the real address |
| `DEMO_MODE` | `true` | Sign-in code is `123456`; 1930 and the complaint portal stay on practice screens |
| `SEED_ON_START` | `true` | An empty database is filled with demo data on first start, so the dashboard is not blank |
| `LIVE_FEED` | `false` | No synthetic traffic unless switched on from the dashboard |
| `ALLOWED_ORIGINS` | `*` | Any browser origin may call the API (it uses bearer tokens, not cookies). Tighten after the dashboard is deployed |

## Free-plan limits to plan around

- **It sleeps after 15 minutes without traffic** and takes about a minute to wake. Twilio gives a webhook 15 seconds, so the first WhatsApp message after a quiet spell gets no reply. Before a demo, open `/health` to wake it, and keep it awake with an uptime pinger hitting `/health` every 10 minutes, or move to a paid instance for the day.
- **512 MB of memory.** Rendering a Complaint Kit starts Chromium; if the service restarts while building a PDF, that is the cause.
- **No persistent disk.** Data is in Atlas, so nothing is lost, except PDFs when S3 is not configured.
- **Never change `HASH_SECRET` or `PHONE_ENC_KEY` after first use.** Stored phone numbers and the community blocklist hashes depend on them.

## Run the same image locally

```bash
docker compose up --build
```
