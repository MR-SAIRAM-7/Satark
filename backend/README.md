# Satark API

Node.js + Express 5 (TypeScript, run with `tsx`) on MongoDB. It adds detection layers 3-5 on top of the phone's layers 1-2, keeps the community blocklist, files complaint cases, alerts families, drives the police dashboard over Socket.IO, and runs the automations on a schedule.

Everything is optional: with no `.env` at all the API starts an embedded MongoDB, seeds demo data and runs in demo mode, so every outbound WhatsApp or push is recorded in the outbox instead of being sent.

## Run

```bash
npm install            # from the repository root
npm run dev            # from the root: API (:8000) and dashboard (:3000) together
npm run backend        # API only, with reload
```

| Command (in `backend/`) | What it does |
|---|---|
| `npm run dev` | API with reload (`tsx watch`) |
| `npm start` | API without reload |
| `npm run seed` | Wipe and re-seed the demo data (stop the API first when using the embedded database, or use **Demo → Reset** on the dashboard) |
| `npm test` | 34 API tests on a throwaway in-memory MongoDB |
| `npm run typecheck` | TypeScript |

First start downloads a MongoDB binary for the embedded database (about 800 MB, cached in your user folder). Set `MONGODB_URI` to use Atlas instead.

**Demo sign-in:** Inspector K. Rao, `+91 90000 00001`, code `123456` (`DEMO_OTP`). Seeded elders use `+91 90000 001xx` and guardians `+91 90000 002xx` (see `src/seed/data.ts`).

## Layout

```text
src/
├── server.ts             start-up: database, seed on first run, HTTP + Socket.IO, cron jobs
├── app.ts                the Express app (Supertest drives it directly)
├── config/env.ts         zod-validated configuration; which integrations are switched on
├── db/                   connection (Atlas or embedded) and the Mongoose models
├── middleware/           JWT roles, rate limits
├── routes/               auth, detection (the app's routes), family, complaints, whatsapp, police, system
├── services/
│   ├── analysis.ts       layers 3-5 orchestration: score = max(layers)
│   ├── ml/               TF-IDF + logistic regression scorer (model from ../ml)
│   ├── ai/               Gemini -> OpenRouter -> Sarvam chain; Sarvam TTS, STT, translation
│   ├── intel.ts          community indicators, confirmation at 3 reporters, phone sync
│   ├── complaints.ts     case filing, Complaint Kit PDF, stage updates, golden hour, bank hold
│   ├── alerts.ts         guardian alerts and escalation
│   ├── notify.ts         WhatsApp (Twilio) and push (Expo), recorded in the outbox
│   ├── listen.ts         Home Guardian live-call sessions and the CUT signal
│   ├── campaigns.ts      DBSCAN + shared-indicator clustering
│   ├── stix.ts           STIX 2.1 export
│   ├── domainHunt.ts     crt.sh look-alike domains
│   ├── enrich.ts         RDAP domain age, Safe Browsing
│   ├── pdf.ts storage.ts headless Chrome/Edge PDF, S3 or signed local links
│   └── realtime.ts       Socket.IO rooms and the dashboard feed
├── jobs/                 node-cron schedule and the demo traffic simulator
└── seed/                 demo data, seeder, one-click storylines
```

## How a message is judged (`POST /v1/analyze`)

1. Layers 1-2 run again on the masked text; links are enriched with RDAP domain age (R5) and Safe Browsing (R6). Rules the phone saw on the unmasked text (`context.local_rules`, `local_rule_score`) count too.
2. The Kill Chain advances across the conversation (`thread_id`).
3. Layer 5 looks the indicators up in the community blocklist (95 confirmed, 60 suspected).
4. Layer 3 scores the text. Its score is scaled by sender trust like the Kill Chain, and on its own it can reach "suspicious" at most: a red alert needs the rules, the Kill Chain, the community or the LLM to agree.
5. Layer 4 (when a key is set and the message is already suspicious) can raise the score and supply better explanations, never lower it.
6. The masked check is stored, the dashboard feed updated, and the elder's guardians alerted at 70+.

## Automations (`src/jobs`)

| Job | Schedule | What it does |
|---|---|---|
| `alerts.escalate` | every 30 s | Critical alerts unacknowledged for `ESCALATE_AFTER_MIN` minutes: remind the guardian, sound the dashboard alarm (twice at most) |
| `cases.golden-hour-reminders` | every 30 s | WhatsApp at 10, 30 and 50 minutes while a golden-hour case is still at "kit ready" |
| `campaigns.cluster` | every 10 min | Re-group reports into campaigns |
| `cases.follow-up` | every 6 h | Cases unchanged for 48 hours: ask the family for the acknowledgement number |
| `intel.decay` | daily | Drop suspected indicators nobody reported for 30 days |
| `feed.trim` | hourly | Keep the dashboard feed to 2,000 events |

Every job records what it has done (reminder tags, escalation counts), so a restart never repeats a message.

## Demo storylines (`POST /v1/demo/scenario`, police role)

| Name | What happens |
|---|---|
| `golden_hour` | Lakshmi receives a three-message digital-arrest conversation, then ₹1.25 L is debited: the case opens by itself, her son is alerted, the dashboard alarm sounds |
| `scam_wave` | A new UPI ID is reported from five localities: confirmed, blocked on every phone, clustered into a campaign |
| `call_cut` | The Home Guardian hears a Telugu-English digital-arrest call; at stage 4 the elder's phone gets the CUT signal |
| `escalation` | A critical alert nobody acknowledged: reminder to the family, alarm on the dashboard |

`POST /v1/demo/feed {"on": true}` (or `LIVE_FEED=true`) adds a synthetic scam event every 10-25 seconds.

## Not yet verified

- **Live providers:** the Gemini, OpenRouter, Sarvam, Twilio, Safe Browsing and S3 calls follow the providers' current API docs but have not been run against real keys here. Without keys every path falls back and is covered by tests.
- **Docker:** the Dockerfiles and `docker-compose.yml` were written but not built on this machine (no Docker installed).
