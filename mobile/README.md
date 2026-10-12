# Satark mobile app

React Native (Expo SDK 57, TypeScript) Android app with a Kotlin native module. Built with EAS; no Android Studio needed.

One app, three modes: **elder** (protection), **guardian** (family alerts) and **Home Guardian** (a spare phone that listens to calls on speaker).

## Run it

```bash
npm install                      # from the repo root: installs every workspace
npm run web --workspace mobile   # fastest way to see the screens (browser, phone-sized)
npx expo start                   # from mobile/: dev server for a development build
```

Everything works with no backend and no API keys: the on-device engine (layers 1-2 and the Kill Chain) and demo data are built in. Open **Settings → Demo control room** to play the scam scenarios.

## Build the APK with EAS

```bash
npm install -g eas-cli
cd mobile
eas login
eas init                                             # once: links the project to your Expo account
eas build --profile preview --platform android       # installable APK for the demo phones
eas build --profile development --platform android   # dev client, for live reload on a phone
```

Install over USB (`adb install satark.apk`). Do not send the APK over WhatsApp: Play Protect blocks sideloaded apps that ask for sensitive permissions.

`EXPO_PUBLIC_*` variables are baked in at build time. Set them in `mobile/.env` for local runs and with `eas env:create` (or in `eas.json`) for cloud builds.

### What needs the installed build

| Works everywhere (web, Expo Go, APK) | Needs the EAS-built APK |
|---|---|
| "Is this safe?" for pasted text, links, UPI IDs | Automatic SMS and WhatsApp scanning |
| Verdict screen, Kill Chain meter, voice warnings | Blocking reported numbers before they ring |
| Demo control room, drills, complaint kit, FIR tracker | Countdown overlay over the dialer, ending the call |
| Guardian and Home Guardian screens | Running 24/7 in the background, surviving reboot |
| | Share to Satark from WhatsApp, QR scanner, PDF file |

## Configuration

Copy `.env.example` to `.env`. All values are optional.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend URL including `/v1`. When set, analysis, voice, translation and WhatsApp go through the backend. |
| `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GEMINI_MODEL` | Layer 4, first choice |
| `EXPO_PUBLIC_OPENROUTER_API_KEY`, `EXPO_PUBLIC_OPENROUTER_MODEL` | Layer 4, second choice |
| `EXPO_PUBLIC_SARVAM_API_KEY` and model names | Layer 4 third choice, translation (Mayura), voice (Bulbul), speech to text (Saaras) |
| `EXPO_PUBLIC_WHATSAPP_BOT_NUMBER` | Twilio WhatsApp sender |

> **Keys in the app are for demos only.** `EXPO_PUBLIC_*` values are readable by anyone with the APK. The direct Gemini / OpenRouter / Sarvam path exists so the app can be shown before the backend is up. Once `EXPO_PUBLIC_API_BASE_URL` is set, remove the provider keys: the backend holds them.

Model IDs change. The defaults (`gemini-flash-latest`, `sarvam-105b`, `bulbul:v3`, `mayura:v1`, `saaras:v3`) were current on 12 Oct 2026; override them in `.env` if a provider renames a model.

## Languages

English is the default. Telugu and Hindi are bundled, so they work offline from first launch. Any other language the user picks (Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia) is translated by **Sarvam Mayura** on first selection and cached on the phone: the interface, explanations, advice and the complaint summary. Voice warnings use **Sarvam Bulbul**, falling back to the phone's own text-to-speech.

To add a language, add a row to `shared/src/languages.ts`.

## How it is organised

```text
mobile/
├── index.ts                 entry: registers background tasks, then loads the router
├── modules/satark-native/   Kotlin: notification listener, call screening, overlay, foreground service
└── src/
    ├── app/                 screens (expo-router; one file per route)
    ├── components/          shared UI; components/ui is the design system
    ├── features/            business logic, no UI
    │   ├── detection/       the pipeline, community blocklist
    │   ├── calls/           pre-ring guard, call-cut countdown
    │   ├── complaint/       kit builder, PDF, FIR tracker, WhatsApp messages
    │   ├── listener/        Home Guardian state machine
    │   └── demo/            scenarios, runner, seed data
    ├── services/            edges of the app: api, ai providers, voice, native bridge, notifications
    ├── store/               zustand stores, persisted with AsyncStorage
    ├── i18n/                en (source of truth), te, hi
    ├── data/                sourced statistics, official-number directory, sample messages
    └── theme/               design tokens
shared/                      @satark/shared: layers 1-2, Kill Chain, parsers, verdict contract (also used by the backend)
```

Two rules keep it maintainable: screens never call providers directly (they go through `services/api`), and everything the phone and server must agree on lives in `shared/`.

### Swapping in the backend

`services/api` exposes one interface, `SatarkApi`, with two implementations: `localApi` (on-device) and `httpApi` (the Node backend). Setting `EXPO_PUBLIC_API_BASE_URL` switches between them; no screen changes. The backend needs these routes:

| Route | Used for |
|---|---|
| `POST /analyze` | Layers 3-5. Body and response are `analyzeRequestSchema` / `analyzeResponseSchema` in `shared/src/verdict.ts`. |
| `POST /tts` `{text, lang}` → `{audio}` | Sarvam Bulbul, base64 WAV |
| `POST /translate` `{texts, lang}` → `{texts}` | Sarvam Mayura |
| `POST /listen` (multipart `audio`, `session_id`) → `{transcript}` | Home Guardian chunks |
| `POST /report`, `GET /iocs/sync?since=` | Community intelligence |
| `POST /complaint/send` `{to, body, media_url}` → `{status}` | Twilio WhatsApp (`demo` when Twilio is not configured) |
| `POST /complaint` | Files the Complaint Kit into the cyber cell's case queue; the case reference shows on the kit screen |
| `POST /auth/device` | Anonymous device session; the JWT is sent on every other call |

The backend lives in [`../backend`](../backend/README.md); `npm run dev` from the repository root starts it with demo data. For the web preview, set `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/v1`; on a phone, use the laptop's LAN IP.

The app never lets the server lower a verdict: `neverLower` in `services/api/http.ts` re-applies the on-device score to whatever comes back.

## Complaints and "automatic FIR filing"

Satark automates everything up to the point where the law requires the victim: the complaint text in the portal's sections, SHA-256 hashing of every evidence item, the Zero FIR letter (BNSS Section 173), the 1930 script, pre-filling every portal field, tracking the seven stages, and a WhatsApp update to the elder and guardian at each stage (through Twilio, from the backend).

It does **not** submit to cybercrime.gov.in on the user's behalf. There is no public API, filing needs the victim's own OTP and a captcha, and automating that would break hackathon rule 9. In demo mode "File online" opens Satark's own practice portal and "Call 1930" opens a practice dialer; nothing reaches a real service, and acknowledgement numbers are prefixed `DEMO-`.

## Before a demo

1. Install the `preview` APK over USB on the elder phone (and the guardian phone).
2. Open Satark and finish onboarding. Under **Settings → Protection permissions**, allow all five.
3. In Android settings, turn battery optimisation **off** and autostart **on** for Satark (Xiaomi, Realme, Vivo and Oppo kill background listeners otherwise).
4. Do Not Disturb off, volume up, mobile data rather than venue Wi-Fi.
5. Keep **Demo mode** on. **Settings → Demo control room** has the three pitch rounds in order.

## Checks

```bash
npm run typecheck    # both workspaces
npm run lint
npm test             # shared engine: scam detection and false-positive cases
```

## Not yet verified

- **Kotlin module:** written against the installed Expo and React Native sources and validated with `expo prebuild`, but not compiled on this machine (no Android SDK). The first EAS build is its real test; fix any compile error it reports before the demo.
- **Live providers:** the Gemini, OpenRouter and Sarvam calls follow the current API docs but have not been run against real keys.
- **Official numbers:** only 1930 and the two SBI lines in `src/data/directory.ts` were confirmed against the organisation's own page. Confirm the rest before showing them as verified.
