# Satark

### AI Scam Shield for Senior Citizens

> **Scammers win by isolating their victims. Satark wins by connecting them.**

Satark (సతర్క్ / सतर्क, "alert") is an Android app that stops cyber fraud against senior citizens **while the scam is happening**. It reads incoming SMS and WhatsApp messages, checks links and UPI requests, and watches live calls. When it spots a scam, it warns the elder **by voice in Telugu, Hindi or English**, alerts their family on the spot, can end a scam call after a 10-second countdown, and builds a complete police complaint kit, delivered on **WhatsApp**, within the golden hour.

**Built with:** React Native (TypeScript) + Kotlin · Node.js + Express · MongoDB Atlas · OpenAI + LangChain.js · Sarvam AI · Twilio WhatsApp · Next.js

**KPRIT Software Hackathon 2026** · 12 Oct 11:00 AM to 13 Oct 11:00 AM
**Track:** Open Innovation (#200), combining **#127** Fraud message detector, **#164** Spam call detector, **#161** Phishing URL detector and **#144** Transaction anomaly alerts
**Also touches:** #32 Elderly care companion · #153 Multilingual voice assistant · #172 Explainable AI dashboard · #132 Grievance redressal

---

## Table of contents

- [The problem](#the-problem)
- [How Satark works](#how-satark-works)
- [Key features](#key-features)
- [System architecture](#system-architecture)
- [Five-layer detection engine](#five-layer-detection-engine)
- [LLMs and AI models used](#llms-and-ai-models-used)
- [Multilingual support with Sarvam AI](#multilingual-support-with-sarvam-ai)
- [WhatsApp integration](#whatsapp-integration)
- [Complete tech stack](#complete-tech-stack)
- [Live call protection](#live-call-protection)
- [Police dashboard and threat intelligence](#police-dashboard-and-threat-intelligence)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Android permissions](#android-permissions-least-privilege)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo mode](#demo-mode)
- [Security and privacy](#security-and-privacy)
- [Evaluation and measured metrics](#evaluation-and-measured-metrics)
- [Roadmap](#roadmap)
- [Team](#team)
- [Credits and licences](#credits-and-licences)
- [Sources](#sources)

---

## The problem

Telangana is India's cybercrime hotspot, and senior citizens lose the most per case.

| Fact | Figure | Scope |
|---|---|---|
| Cybercrime FIRs registered | 21,639, about 44% of India's 49,620 | Telangana, 2025 |
| Money lost to fraud | ₹1,524 crore | Telangana, 2025 |
| Lost by senior citizens | ₹102 crore in 403 cases | Hyderabad, Jan 2025 to Jul 2026 |
| Largest categories | Trading frauds (113 cases, ₹55.88 crore) and digital arrest | Hyderabad seniors |
| Share of losses from investment frauds | Nearly 60% | Telangana |
| Complaints and losses nationally | 24 lakh+ complaints, ₹22,495 crore | India, 2025 |
| Lost by senior citizens nationally | ₹4,005 crore across 1,03,488 complaints | India, 2025 |
| SIM cards blocked | 12.21 lakh | India, to end of 2025 |
| Digital arrest losses | About ₹3,000 crore, victims mostly elderly | Supreme Court, Nov 2025 |

A 70-year-old retired gazetted officer in Hyderabad lost **₹85 lakh** to a fraudster posing as a Mumbai Police officer.

**Why existing tools fail**

- **Number lists lag.** Caller-ID and spam apps block known numbers, but scammers rotate SIMs faster than the lists update.
- **Wrong language, few phones.** Google's on-device scam detection in India runs only on Pixel 9 and later (under 1% of Indian phones), only in Hindi and English, and is off by default.
- **After the fact.** Sanchar Saathi (Chakshu), the 1930 helpline and cybercrime.gov.in are reporting channels people use after the money is gone.
- **Isolation.** Scammers order victims to stay on the call and tell no one, so families find out too late.
- **Slow, incomplete complaints.** Victims in panic forget the UTR number, the scammer's UPI ID and the timestamps that banks need to freeze money.

---

## How Satark works

Three people use Satark, and the elder never has to type anything.

| Persona | Who | What Satark gives them |
|---|---|---|
| **Ammamma** (primary) | 68, retired teacher in Hyderabad; reads Telugu, little English; takes calls on speaker | Automatic Telugu voice warnings, one big **"Is this safe?"** button, a red full-screen alert, a call-cut countdown |
| **Ravi** (guardian) | 38, her son, works in Bengaluru | Instant alert with the scam summary, one-tap call to her, complaint kit on WhatsApp |
| **Inspector Rao** (police analyst) | Cyber crime cell officer | Live campaign map, top reported numbers and UPI IDs, STIX export for sharing |

Women and students, who are also heavily targeted, can use the same app without a guardian link.

**Journey 1: a scam message (core flow)**

1. A WhatsApp message arrives: *"This is Mumbai Police. Your Aadhaar is linked to money laundering."*
2. The notification listener captures the text, and layers 1 and 2 run on the phone.
3. The message looks suspicious, so masked text goes to the server, where layers 3 to 5 return a verdict.
4. The phone shows a full-screen red alert with the Kill Chain meter at stage 2 and plays a Telugu voice warning: *"This is a scam. Real police never arrest anyone on a call."*
5. The guardian gets a push alert with the summary. Each further message from the scammer moves the meter up.

**Journey 2: a scam call.** A number already reported by the community is rejected before it rings. A new number claiming to be a bank triggers a warning that banks call only from 1600-series numbers. On a live call, the Home Guardian phone transcribes the conversation, and at stage 4 the elder's phone shows a 10-second countdown and then ends the call.

**Journey 3: money debited after a scam.** A bank debit SMS within 60 minutes of a high-risk conversation makes Satark ask: *"Did someone ask you to send this money?"* Answering yes opens the golden-hour flow, with a 1930 script card showing the amount, UTR, time and the scammer's details.

**Journey 4: the complaint.** The elder or guardian taps **Report**. Within 30 seconds Satark assembles the evidence, writes the complaint, builds a PDF and sends it to both phones on WhatsApp.

---

## Key features

**P0: core flow (must work)**

| ID | Feature | Statement | Acceptance criteria |
|---|---|---|---|
| F1 | **Message scanner**: reads SMS and WhatsApp notifications automatically; share-to-Satark; paste text or screenshot; forward to Satark's WhatsApp number | #127 | A scam WhatsApp message triggers an alert within 5 s; shared, pasted and forwarded text and images are checked |
| F2 | **Five-layer detection engine** with verdict rule | #127, #172 | Returns verdict, score, Kill Chain stage, quoted evidence and explanations in Telugu, Hindi and English as JSON; the AI layer never lowers the rule or ML score |
| F3 | **Verdict screen with live Scam Kill Chain meter** | #172 | Red, amber or green screen; five-stage meter with the quoted phrase under each stage; climbs as messages arrive |
| F4 | **Voice warnings in Telugu, Hindi and English** | #153 | Spoken within 2 s of the verdict; Sarvam Bulbul voice with Android TTS fallback |
| F5 | **Link and UPI checker** | #161 | Flags look-alike domains of 20 banks and government services, domains under 30 days old and Safe Browsing hits; flags "scan to receive money" QR codes, collect requests and payee-name mismatch |
| F6 | **Family guardian alerts** | #32 | A high-risk event reaches the guardian within 5 s with a summary and a **"Call her"** button |
| F7 | **Elder-first interface** | #32 | Telugu by default, large text, one "Is this safe?" button, every result also spoken aloud |
| F8 | **Demo mode** | – | Mock complaint portal and mock 1930 dialer; "Demo mode" banner; nothing reaches real services |

**P1: the features that win**

| ID | Feature | Statement | Acceptance criteria |
|---|---|---|---|
| F9 | **Call guard before ring** | #164 | Community-reported number rejected before ringing; "bank" callers not on 1600-series and international numbers get a warning |
| F10 | **Live call protection with countdown cut** | #164 | The call ends about 10 s after stage 4; "It's safe" cancels the countdown |
| F11 | **Transaction-after-scam alert** | #144 | A debit SMS within 60 min of a high-risk event triggers the prompt; amount, bank and UTR are parsed |
| F12 | **Complaint Kit and WhatsApp delivery** | #132 | PDF with complaint, hashed evidence annex and Zero FIR letter, ready in under 30 s, delivered to both phones |
| F13 | **Community threat intelligence** | #164, #127 | A number reported on one phone is blocked on another within 60 s |
| F14 | **Police dashboard with STIX export** | #144, #172 | New reports appear live on the map; export produces a valid STIX 2.1 bundle |
| F15 | **Prompt-injection and disguise defence** | #127 | An injected scam message is flagged "scam + injection attempt"; accuracy under attack is reported |
| F16 | **Family safe-word** | #32 | A call claiming to be a relative in trouble shows "Ask for the family safe word" |
| F17 | **Call back the real one** | #164 | One tap dials the bank's or police's official number from a team-verified directory instead of the caller |
| F18 | **Offline protection** | – | Layers 1 and 2 plus cached reported numbers work with the internet off |

**P2: stretch goals**

| ID | Feature | Statement | What it does |
|---|---|---|---|
| F19 | Phishing domain hunter | #161 | Certificate Transparency search lists suspected look-alike domains of Indian banks |
| F20 | Scam drills ("scam vaccine") | #32 | Practice mode plays a safe simulated scam in Telugu; guardian sees a readiness score |
| F21 | Guardian Chrome extension | #161 | Calls the same API and warns on look-alike links in the guardian's browser |
| F22 | AI Ammamma scam-baiter | – | Role-play only: an AI grandma keeps a scammer chatting and extracts UPI IDs into threat intel |
| F23 | Weekly "scam weather" voice note | #153 | A 30-second Telugu voice note on trending scams, generated from dashboard data |

---

## System architecture

The phone does the fast, private checks. The Node.js server adds the ML model, the LLM and community intelligence, then pushes actions back to the elder, the guardian and the police dashboard.

Because the app (React Native) and the server (Node.js) both run TypeScript, layers 1 and 2 are **one shared package** (`shared/`). The phone and the server run exactly the same clean-up and rules code, so they can never disagree.

```mermaid
flowchart LR
    subgraph IN["What comes in"]
        A1["SMS and WhatsApp<br/>notifications"]
        A2["Links and UPI QR"]
        A3["Screenshots"]
        A4["Calls and audio"]
        A5["Messages forwarded<br/>to Satark on WhatsApp"]
    end

    subgraph PHONE["On the phone: React Native + Kotlin (works offline)"]
        L1["1. Clean-up<br/>undoes disguised and hidden text"]
        L2["2. India rules<br/>SMS sender suffix, 1600 calls, UPI"]
        L1 --> L2
    end

    subgraph SERVER["On the server: Node.js + Express"]
        L3["3. ML classifier<br/>TF-IDF + logistic regression"]
        L4["4. AI Kill Chain<br/>LangChain.js: OpenAI → Sarvam-105B"]
        L5["5. Community intel<br/>MongoDB: hashed numbers, UPI IDs, links"]
        L3 --> L4 --> L5
    end

    subgraph OUT["What Satark does"]
        O1["Voice warning<br/>Sarvam Bulbul v3"]
        O2["Family alert<br/>Firebase Cloud Messaging"]
        O3["Call cut<br/>10-second countdown"]
        O4["Complaint Kit<br/>Twilio WhatsApp API"]
        O5["Police campaign map<br/>Next.js + Leaflet + Socket.IO"]
    end

    IN --> L1
    A5 -->|Twilio webhook| L3
    L2 -->|flagged, masked text only| L3
    L5 --> OUT
    L2 -.->|offline verdict| O1
```

> Layers 1 and 2 run on the phone, so most messages never leave it.

---

## Five-layer detection engine

Five layers score every input. The final score is the **highest** of them, so the AI layer can raise the risk but can never lower it.

| Layer | Runs on | What it does | How we build it |
|---|---|---|---|
| **1. Clean-up** | Phone and server | Undoes disguises: NFKC normalisation, strips zero-width characters, maps look-alike letters (Cyrillic "Ѕ" → "S"), joins spaced letters ("S B I"), reverses leetspeak (0→o, 1→i, @→a) | TypeScript function in `shared/`, imported by both the app and the server |
| **2. India rules** | Phone and server | Deterministic red flags (below) | `shared/rules.json` plus a small TypeScript rule engine in `shared/` |
| **3. ML classifier** | Server | Scam probability from text | TF-IDF character n-grams + logistic regression, trained with scikit-learn in `ml/`, exported to JSON and scored in Node (no Python at runtime) |
| **4. AI Kill Chain** | Server | Scam type, stage, tactics, quoted evidence, explanations in three languages | LangChain.js chain: OpenAI GPT with zod-validated JSON output, falling back to Sarvam-105B; the message is passed as quoted data |
| **5. Community intel** | Server, cached on phone | Matches keyed hashes of numbers, UPI IDs and domains against confirmed reports | MongoDB `iocs` collection, synced to a native cache on the phone |

**Verdict rule**

```text
score = max(rules, ML, community, AI)
```

| Score | Verdict | What happens |
|---|---|---|
| 0–39 | 🟢 Safe | Nothing shown unless the user asked |
| 40–69 | 🟠 Suspicious | Card with reasons and a voice note; guardian not alerted |
| 70–100 | 🔴 Scam | Full-screen alert, voice warning, guardian alert |
| 85+ and stage 4 or 5 on a live call | ✂️ Cut | 10-second countdown, then the call ends |

<details>
<summary><b>India rules (layer 2)</b></summary>

| Rule | Red flag | Risk points |
|---|---|---|
| R1 | Bank, KYC or OTP message from a 10-digit mobile number instead of a registered sender ID | +60 |
| R2 | Sender ID suffix does not match the claim (a "bank alert" from a `-P` promotional header) | +30 |
| R3 | Caller claims to be a bank but the number is not 1600-series | +60 |
| R4 | Link domain looks like an allowlisted bank or government domain but is not | +70 |
| R5 | Link domain registered under 30 days ago | +30 |
| R6 | Google Safe Browsing match | +90 |
| R7 | QR code or collect request when the user expects to receive money | +90 |
| R8 | UPI payee name does not match the brand claimed in the message | +50 |
| R9 | APK file or link ("challan.apk", "rewards.apk") | +80 |
| R10 | AnyDesk or TeamViewer QuickSupport notification during a call with an unknown number | +90 |
| R11 | Authority + threat + secrecy phrases together ("CBI", "arrest warrant", "don't tell anyone") | +50 |
| R12 | Unexpected international number on a call or WhatsApp | +20 |

Since 6 May 2025 every commercial SMS sender ID ends in `-P`, `-S`, `-T` or `-G`. RBI requires banks to make transactional calls from 1600xx and promotional calls from 140xx, and TRAI extended the 1600-series to all banking, insurance and finance service calls in November 2025. Satark treats R3 as a strong signal, not proof, while firms migrate.

</details>

<details>
<summary><b>Scam Kill Chain (five stages)</b></summary>

| Stage | What the scammer does | Typical phrases | Extra signals |
|---|---|---|---|
| 1. Contact | Unsolicited message or call | "Your parcel is held", "KYC pending" | Unknown number, odd hour |
| 2. Impersonation | Claims to be police, CBI, bank, courier, TRAI, electricity board | "This is Mumbai Police", "SBI KYC team" | R1, R3 |
| 3. Threat or lure | Arrest, account freeze, disconnection; or high returns, prizes | "arrest warrant", "account blocked today", "guaranteed returns" | Urgency words |
| 4. Isolation | Secrecy, stay on the call, move to video call | "don't tell your family", "do not disconnect" | Long call with unknown number |
| 5. Payment or access | Transfer, OTP, UPI PIN, screen share, APK install | "transfer to verification account", "share the OTP" | R7, R9, R10 |

</details>

**Latency budget**

| Step | Budget |
|---|---|
| Layers 1–2 on the phone | < 50 ms |
| Layers 3 and 5 | < 300 ms |
| Layer 4 AI call | 1–2 s |
| Voice playback starts | within 2 s of the verdict |

---

## LLMs and AI models used

Satark does **not** rely on an LLM alone. The rules and our own trained classifier carry the verdict; the LLM explains the verdict and can only raise the risk score.

| Purpose | Model | Provider | Why we chose it |
|---|---|---|---|
| **Scam reasoning: Kill Chain stage, tactics, quoted evidence, advice** (layer 4) | **OpenAI GPT** model with structured JSON output (set with `OPENAI_MODEL`), orchestrated with **LangChain.js** | OpenAI | Reliable structured output, validated against a zod schema; strong reasoning on code-mixed text |
| **Indian-language reasoning and explanations** (Telugu, Hindi); **fallback for layer 4** | **Sarvam-105B** (`sarvam-105b`) | Sarvam AI | Built for Indian languages; natural Telugu and Hindi explanations for the elder |
| **Speech to text** (Home Guardian live-call transcription) | **Sarvam Saaras v4**, with **OpenAI Whisper** fallback | Sarvam AI / OpenAI | Telugu, Hindi and Indian-English speech, including code-mixed speech |
| **Text to speech** (voice warnings) | **Sarvam Bulbul v3** | Sarvam AI | Natural Telugu and Hindi voices; Android TextToSpeech as offline fallback |
| **OCR** (screenshots of scam messages) | **Sarvam Vision**, with **tesseract.js** fallback | Sarvam AI / open source | Reads Telugu and English screenshots |
| **Scam classifier** (layer 3) | **TF-IDF character n-grams + logistic regression**, trained by us | scikit-learn (training), Node.js (scoring) | Trains in minutes, explainable features, measurable precision and recall |
| **Campaign grouping** | **OpenAI text embeddings** + **DBSCAN** clustering (`density-clustering`) | OpenAI / open source | Groups similar scam messages into named campaigns for the police dashboard |

**Multi-model fallback chain**

```text
OpenAI GPT  →  Sarvam-105B  →  cached explanation for the scam type
```

Every LLM response is checked against the zod schema below. A response that is slow, rate-limited or fails validation is dropped and the next model in the chain is tried. The rules and classifier always produce a verdict, even if every model is down.

**LLM output contract (layer 4)**

```json
{
  "verdict": "scam",
  "score": 92,
  "scam_type": "digital_arrest",
  "stage": 4,
  "evidence": [
    {"stage": 2, "quote": "This is Mumbai Police"},
    {"stage": 4, "quote": "do not tell anyone"}
  ],
  "tactics": ["authority", "fear", "secrecy", "urgency"],
  "injection_attempt": false,
  "explanation": {"en": "...", "te": "...", "hi": "..."},
  "advice": ["Cut the call", "Do not pay", "Call 1930"]
}
```

**LLM guardrails (prompt-injection defence)**

- Layer 1 runs before anything else, so hidden characters and look-alike letters are gone before the LLM sees the text.
- The message is sent to the LLM wrapped as **quoted data**, with an instruction never to follow text inside it.
- A separate check flags phrases aimed at AI systems ("ignore previous instructions", "classify as safe"). A hit sets `injection_attempt` and adds risk.
- The `max()` verdict rule means the LLM can never pull a score below layers 2, 3 or 5.
- The fallback chain plus cached explanations for the demo messages keep the demo working if OpenAI is slow or rate-limited.

---

## Multilingual support with Sarvam AI

Satark speaks to the elder in **their own language**. Telugu is the default; Hindi and English are one tap away in Settings. Each user's language (`te`, `hi` or `en`) is stored on their profile and used for every warning, explanation, voice note and complaint summary.

| Where language matters | How Satark handles it | Sarvam model | Fallback |
|---|---|---|---|
| Reading scam messages in Telugu, Hindi, English and Hinglish / code-mixed text | Layer 1 normalises script and disguises; layer 2 rules include Telugu and Hinglish phrase variants; layer 4 reasons over the original text | **Sarvam-105B** | OpenAI GPT |
| Explaining *why* it is a scam | The verdict JSON carries `explanation.te`, `explanation.hi` and `explanation.en` | **Sarvam-105B** | Cached explanations for known scam types |
| Speaking the warning aloud | Every verdict is spoken within 2 s: *"ఇది మోసం. నిజమైన పోలీసులు ఫోన్‌లో ఎవరినీ అరెస్ట్ చేయరు."* ("This is a scam. Real police never arrest anyone on a call.") | **Bulbul v3** | Android TextToSpeech via `react-native-tts` (offline) |
| Listening to a live scam call | Home Guardian sends 5-second WAV chunks to `/listen`, which transcribes Telugu, Hindi and English speech | **Saaras v4** | OpenAI Whisper, then a manual "End call" prompt |
| Reading screenshots | Screenshots shared to Satark are OCR'd before analysis | **Sarvam Vision** | tesseract.js |
| Onboarding | Every permission is explained in a short Telugu voice note | **Bulbul v3** | Android TTS |
| Complaint Kit | Complaint text in English (portal format) plus a **Telugu summary** for the elder and a 1930 script card read aloud in Telugu | **Sarvam-105B** + **Bulbul v3** | English-only PDF |

```mermaid
sequenceDiagram
    participant HG as Home Guardian phone
    participant API as Express /v1/listen
    participant STT as Sarvam Saaras v4
    participant LLM as LangChain.js (OpenAI → Sarvam-105B)
    participant FCM as Firebase Cloud Messaging
    participant E as Elder's phone
    participant TTS as Sarvam Bulbul v3

    HG->>API: 5-second WAV chunk + session ID
    API->>STT: Audio (te / hi / en)
    STT-->>API: Transcript
    API->>API: Keyword check ("CBI", "arrest warrant", "don't disconnect")
    API->>LLM: Kill Chain on the last 60 seconds
    LLM-->>API: Stage 4, score 91
    API->>FCM: "CUT" signal
    FCM->>E: Red overlay + 10-second countdown
    E->>TTS: Warning text in Telugu
    TTS-->>E: Voice warning plays
```

Audio stays in memory (`multer` memory storage) and is never written to disk or the database; the Home Guardian screen shows *"Satark is listening"* the whole time.

---

## WhatsApp integration

WhatsApp is where most scams reach elders in India, so Satark uses it in both directions, through the **Twilio WhatsApp API**.

### Inbound: catching scams that arrive on WhatsApp

- **Automatic scanning.** A native Kotlin `NotificationListenerService` reads the text and sender of incoming **WhatsApp** and SMS notifications and emits them to React Native through the `SatarkNative` module. Layers 1 and 2 run instantly on the phone, and only flagged, masked text goes to the server.
- **Share to Satark.** From any WhatsApp chat, the elder or guardian can long-press a message or image, tap **Share → Satark**, and get a verdict (Android `ACTION_SEND` intent, `react-native-receive-sharing-intent`).
- **Forward to Satark.** Family members who have not installed the app can forward a suspicious message to Satark's WhatsApp number. Twilio posts it to `/v1/whatsapp/inbound`; the server checks the `X-Twilio-Signature` header, runs layers 1 to 5 and replies with the verdict and a voice note in the sender's language.
- **International WhatsApp numbers** raise risk (rule R12).

```ts
// mobile/src/native/messages.ts
import { NativeEventEmitter, NativeModules } from "react-native";
import { clean, applyRules, mask } from "@satark/shared";
import { analyze } from "../api";
import { alertUser } from "../alerts";

const { SatarkNative } = NativeModules;
const events = new NativeEventEmitter(SatarkNative);

events.addListener("onNotification", async ({ app, sender, text }) => {
  const cleaned = clean(text);                        // layer 1
  const local = applyRules(cleaned, { app, sender }); // layer 2, works offline
  if (local.score < 40) return;                       // most messages stop here

  const verdict = await analyze({                     // layers 3–5 on the server
    source: app,
    sender,
    text: mask(cleaned),
    context: { local_rule_score: local.score, local_rules: local.rules },
  }).catch(() => local);                              // offline: keep the local verdict

  alertUser(verdict);
});
```

### Outbound: delivering the Complaint Kit on WhatsApp

When the user taps **Report**, the backend builds the Complaint Kit PDF, uploads it to **AWS S3**, creates a presigned URL that expires in about 10 minutes, and sends the PDF to **both the elder and the guardian** with the **Twilio WhatsApp API**.

```mermaid
sequenceDiagram
    participant U as Elder / Guardian
    participant App as Satark app
    participant API as Express /v1/complaint
    participant AI as LangChain.js (OpenAI → Sarvam-105B)
    participant S as AWS S3
    participant WA as Twilio WhatsApp API

    U->>App: Tap "Report"
    App->>API: POST /v1/complaint (check IDs)
    API->>AI: Draft complaint from evidence
    API->>API: Render PDF (Puppeteer + Noto Sans Telugu), SHA-256 every evidence item
    API->>S: Upload PDF, create presigned URL (~10 min)
    App->>API: POST /v1/complaint/send
    API->>WA: Send PDF to elder and guardian
    WA-->>U: "Satark: complaint kit ready. Call 1930 now."
```

```ts
// backend/src/services/whatsapp.ts
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendKitWhatsApp(to: string, pdfUrl: string) {
  return client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${to}`,
    body: "Satark: complaint kit ready. Call 1930 now.",
    mediaUrl: [pdfUrl],
  });
}
```

**What is in the Complaint Kit (one PDF)**

1. Complaint text in English following the cybercrime.gov.in sections (incident, suspect, transaction, evidence), plus a **Telugu summary** for the elder.
2. Suspect details: phone numbers, UPI IDs, links, bank account hints.
3. Transaction details from the debit SMS: amount, bank, time, UTR or reference number.
4. Evidence annex: messages, screenshots, call log entry and flagged transcript lines, each with its **SHA-256 hash**.
5. **Zero FIR request letter** (BNSS Section 173) to hand in at any police station.
6. A **1930 script card**, read aloud in Telugu: what to say, in order.

Satark never auto-submits complaints. There is no public API for cybercrime.gov.in, filing needs the victim's own OTP and a captcha, and bot submission would break hackathon rule 9. Instead, **guided filing** opens the 1930 script card or shows a copy button for every portal field, and the user then enters the acknowledgement number so Satark can track it.

### WhatsApp setup with Twilio (about 30 minutes)

1. Create a Twilio account and open **Messaging → Try it out → Send a WhatsApp message** to activate the **WhatsApp Sandbox**. Note the sandbox number and your join code.
2. On the elder and guardian demo phones, send `join <your-code>` to the sandbox number on WhatsApp.
3. Free-form messages, including PDFs, are allowed for **24 hours after a phone last messaged the number**, so both demo phones send "Hi" at the start of the demo day.
4. Sandbox membership **expires after 3 days**. Re-join from both phones the day before presenting.
5. In the sandbox settings, set **When a message comes in** to `https://<your-backend>/v1/whatsapp/inbound` (an `ngrok` URL while running locally).
6. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` and `PUBLIC_BASE_URL` in `backend/.env`.
7. **Fallback:** if the API fails, an Android share intent opens WhatsApp with the PDF attached, and the user taps Send.

> A production WhatsApp sender (approved business profile and message templates) is out of scope for the 24-hour hackathon.

---

## Complete tech stack

| Layer | Technology | Why |
|---|---|---|
| **Android app** | **React Native** (TypeScript, React Native CLI) + **Kotlin** native modules | One language across app and server; native Kotlin where Android requires it |
| **Native Android APIs** | `NotificationListenerService`, `CallScreeningService` + `RoleManager.ROLE_CALL_SCREENING`, `TelecomManager.endCall()`, `TelephonyCallback` / `PhoneStateListener`, `WindowManager` overlay (`TYPE_APPLICATION_OVERLAY`), `ACTION_SEND` share intent, Android `TextToSpeech` | Message capture, pre-ring blocking, live-call cut, countdown overlay, offline voice |
| **React Native packages** | `@react-native-firebase/messaging`, `react-native-tts`, `react-native-sound`, `react-native-audio-record`, `react-native-receive-sharing-intent`, `@react-navigation/native`, `react-native-config`, `@react-native-async-storage/async-storage`, `axios` | Push alerts, offline voice, Bulbul playback, Home Guardian audio, share-to-Satark, navigation, config, settings, API calls |
| **Shared code** | `@satark/shared` TypeScript package (npm workspace) | Clean-up, India rules, masking and the verdict schema, identical on phone and server |
| **Backend** | **Node.js** + **Express** (TypeScript) | REST API and Twilio webhooks in the same language as the app |
| **Database** | **MongoDB Atlas** with **Mongoose** | Flexible documents for checks, evidence and indicators; free tier |
| **Auth** | Phone sign-in with a one-time code (**Twilio Verify**), then **JWT** (`jsonwebtoken`) with role-based middleware | Elders never type a password; elder, guardian and police roles |
| **File storage** | **AWS S3** with presigned URLs | Complaint PDFs and evidence; links expire in about 10 minutes |
| **Realtime** | **Socket.IO** | New reports appear live on the police dashboard |
| **AI reasoning (LLM)** | **OpenAI GPT** via **LangChain.js**, zod-validated JSON; **Sarvam-105B** fallback | Kill Chain stage, evidence, explanations in three languages |
| **ML classifier** | **scikit-learn** for training (`ml/`), scored in Node from exported JSON | Trains in minutes; explainable features; no Python in production |
| **Speech** | **Sarvam Saaras v4** (speech to text), **Sarvam Bulbul v3** (text to speech); **OpenAI Whisper** and Android TTS fallbacks | Telugu, Hindi and English voice |
| **OCR** | **Sarvam Vision** or **tesseract.js** | Telugu and English screenshots |
| **Push alerts** | **Firebase Cloud Messaging** (`firebase-admin` on the server) | Guardian alerts and the "CUT" signal |
| **Messaging** | **Twilio WhatsApp API** | Complaint Kit delivery and the forward-to-Satark bot |
| **Link checks** | RDAP lookups, `fastest-levenshtein`, **Google Safe Browsing API** | Domain age, look-alike detection, known bad links |
| **Campaign grouping** | **OpenAI embeddings** + DBSCAN (`density-clustering`) | Groups similar scam messages |
| **Threat sharing** | STIX 2.1 JSON, validated with **Ajv** against the OASIS STIX schemas | Standard format for cyber cells and CERT teams |
| **PDF** | **Puppeteer** (HTML to PDF) + **Noto Sans Telugu** | Chromium's text shaping renders Telugu letter combinations correctly |
| **Police dashboard** | **Next.js** / React + **Tailwind CSS** + **Leaflet** map | Live campaign map |
| **Domain hunting** | **crt.sh** (Certificate Transparency) | Finds look-alike bank domains (passive lookups only) |
| **Security tooling** | `helmet`, `express-rate-limit`, `zod` request validation, `multer` upload limits, `sharp` (re-encode images, strip EXIF), **gitleaks** (pre-commit), `npm audit`, `eslint-plugin-security`, **OWASP ZAP** baseline (own deployment only) | Secure by default |
| **Testing and CI** | **Jest** + **Supertest** (API), **React Native Testing Library** (app), **Postman** collection, **GitHub Actions** | Every push is linted and tested |
| **Hosting** | **Render** (backend, Docker), **Vercel** (dashboard), **MongoDB Atlas**, **ngrok** for local webhooks | Free tiers, quick deploys |
| **Demo tooling** | **scrcpy** (mirror the elder phone to the projector), `adb` | Live demo on stage |

---

## Live call protection

```mermaid
flowchart TD
    A["Incoming call"] --> B{"Reported number?"}
    B -->|yes| C["Rejected before ringing<br/>elder and guardian notified"]
    B -->|no| D["Call rings; elder answers on speaker"]
    D --> E["Home Guardian listens<br/>transcribes 5-second chunks"]
    E --> F{"Stage 4+ and score 85+?"}
    P["Phone signals also count<br/>long unknown call, AnyDesk alert,<br/>debit SMS during the call"] --> F
    F -->|no, keep listening| E
    F -->|yes| G["Red overlay + Telugu warning<br/>10-second countdown starts"]
    G --> H{"'It's safe' tapped?"}
    H -->|yes| I["Call continues<br/>Satark keeps watching"]
    H -->|no| J["Call ended<br/>guardian alerted, number reported,<br/>Complaint Kit offered"]
```

A wrongly cut call can be returned; life savings cannot. Next time, this number is rejected before ringing for every Satark user.

**Android limits we design around**

- Android gives call audio only to the call itself, accessibility services and pre-installed system apps, so Satark cannot listen on the same phone. The **Home Guardian** is a second phone (a family's spare phone works) listening on speaker.
- Call screening sees the caller's number before it rings but must answer within seconds, possibly before the React Native runtime has started. `SatarkScreeningService` is therefore pure Kotlin and reads the reported-number cache from native storage, which the app keeps in sync through `SatarkNative.syncReportedHashes()`.
- `TelecomManager.endCall()` is deprecated since Android 10 but still works on many phones. We test it on the demo phones and keep the overlay prompt as a fallback; the guaranteed production path is becoming the default phone app (`InCallService`).

```kotlin
class SatarkScreeningService : CallScreeningService() {
    override fun onScreenCall(details: Call.Details) {
        val number = details.handle?.schemeSpecificPart ?: return
        val reported = ScamCache.isReported(hashNumber(normalize(number))) // local cache only
        respondToCall(details, CallResponse.Builder()
            .setDisallowCall(reported).setRejectCall(reported).build())
        if (reported) Notifier.blockedCall(this, number) else CallContext.start(number)
    }
}
```

---

## Police dashboard and threat intelligence

Every confirmed report becomes intelligence. It protects all users within a minute and shows police which scam campaigns are running right now.

**Community intelligence ("herd immunity for scams")**

1. A confirmed report extracts indicators: phone numbers, UPI IDs and domains.
2. Each one is stored in MongoDB as an HMAC-SHA256 hash (keyed with `HASH_SECRET`) with a report count; three or more independent reports mark it **confirmed**.
3. Phones pull new hashes through `/iocs/sync` and an FCM push, so call screening and message checks work offline.

**Dashboard panels** (Next.js web app, login required, police role only)

| Panel | Shows |
|---|---|
| Live map | Reports by locality (never exact location), coloured by scam type, updated over Socket.IO |
| Active campaigns | Label, report count, first and last seen, sample masked message |
| Top indicators | Most-reported numbers, UPI IDs and domains (shown masked) |
| Trends | Reports per hour by scam type |
| Domain hunter | Suspected look-alike bank domains from Certificate Transparency |
| Export | STIX 2.1 bundle for sharing with cyber cells and CERT teams |

---

## API reference

Node.js + Express, all routes under `/v1`. Request bodies are validated with zod; every route except the Twilio webhook needs a JWT.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/otp/start` | Send a sign-in code to a phone number (Twilio Verify) |
| `POST` | `/auth/otp/verify` | Check the code; returns a JWT with the user's role |
| `POST` | `/analyze` | Text, image, link or UPI string in; verdict JSON out (layers 3–5) |
| `POST` | `/listen` | 5-second audio chunk plus session ID; returns transcript, stage and cut flag |
| `POST` | `/report` | Confirm a scam; updates intel, alerts guardian |
| `GET` | `/iocs/sync?since=` | Hashed reported numbers, UPI IDs and domains for the phone cache |
| `POST` | `/guardian/link` | Pair elder and guardian with a code |
| `POST` | `/txn/check` | Parsed debit SMS in; links it to a recent high-risk check |
| `POST` | `/complaint` | Builds the kit; returns PDF URL and evidence hashes |
| `POST` | `/complaint/send` | Sends the kit on WhatsApp |
| `POST` | `/whatsapp/inbound` | Twilio webhook for messages forwarded to Satark (signature-checked) |
| `GET` | `/dashboard/campaigns` | Campaigns, counts and map points |
| `GET` | `/stix/export` | STIX 2.1 bundle of confirmed indicators |
| `GET` | `/domains/hunt` | Certificate Transparency results |
| `POST` | `/drill/result` | Scam drill outcome |

**Example request to `/v1/analyze`**

```json
{
  "source": "whatsapp",
  "sender": "+9198XXXXXXXX",
  "sender_header": null,
  "text": "This is Mumbai Police. Your Aadhaar is linked to money laundering...",
  "lang": "te",
  "context": {"on_call": false, "local_rule_score": 50, "local_rules": ["R11"]}
}
```

The response is the [LLM output contract](#llms-and-ai-models-used) with the fused score.

---

## Data model

One MongoDB Atlas database, with Mongoose models. Scammers' phone numbers, UPI IDs and domains are stored **only as hashes keyed with a server-wide secret**, so matching works but raw values are never kept. Users' own phone numbers are encrypted (AES-256-GCM), because Satark needs them to deliver the Complaint Kit on WhatsApp.

| Collection | Key fields | Notes |
|---|---|---|
| `users` | _id, role (elder, guardian, police), phone_hash, phone_enc, language, created_at | `phone_hash` for lookups, `phone_enc` for WhatsApp delivery; language: `te`, `hi` or `en` |
| `guardian_links` | elder_id, guardian_id, created_at | Paired with a 6-digit code |
| `devices` | user_id, fcm_token, platform | For push alerts |
| `checks` | _id, user_id, source (sms, whatsapp, share, forward, call, transcript), masked_text, sender_hash, verdict, score, stage, scam_type, layer_scores, created_at | One document per analysed item |
| `iocs` | _id, type (phone, upi, domain), value_hash, report_count, status (suspected, confirmed), campaign_id, first_seen, last_seen | Community intel; unique index on (type, value_hash) |
| `reports` | _id, user_id, check_id, ioc_ids, locality, created_at | Locality only, never exact location |
| `campaigns` | _id, label, scam_type, report_count, first_seen, last_seen | Built by clustering |
| `complaints` | _id, user_id, check_ids, pdf_key, pdf_sha256, ack_number, status, created_at | Kit and tracking; `pdf_key` is the S3 object key |
| `drills` | _id, user_id, scenario, passed, created_at | Scam drill results |

---

## Android permissions (least privilege)

| Permission | Why | Needed for |
|---|---|---|
| Notification access | Read SMS and WhatsApp notification text | F1 (core) |
| Call-screening role | See the caller's number before it rings; reject reported numbers | F9 |
| `READ_PHONE_STATE` | Know when a call is active or ends | F10 |
| `ANSWER_PHONE_CALLS` | End a call | F10 |
| Display over other apps | Red overlay during a call | F10 |
| `POST_NOTIFICATIONS` | Alerts | All |
| `RECORD_AUDIO` | Home Guardian phone only | F10 |
| `INTERNET` | Server calls | All |

**Deliberately not used:** SMS read/receive (notification access already covers SMS), Accessibility Service (the permission banking malware abuses), call log, and the all-packages query. A manifest `<queries>` entry covers only AnyDesk (`com.anydesk.anydeskandroid`) and TeamViewer QuickSupport (`com.teamviewer.quicksupport.market`).

---

## Getting started

> The repository is being built live during the hackathon. The layout below is the target structure.

```text
Satark/
├── mobile/       # React Native app (elder, guardian and Home Guardian modes) + Kotlin native modules
├── backend/      # Node.js + Express API: layers 3–5, /listen, complaint kit, Twilio WhatsApp, STIX
├── dashboard/    # Next.js police dashboard with Leaflet map
├── shared/       # @satark/shared: clean-up, India rules (rules.json), masking, verdict schema
├── ml/           # Python: classifier training, test sets, evaluation; exports model JSON for the backend
└── docs/         # Architecture, PRD, Postman collection, screenshots, measured metrics
```

The root `package.json` defines npm workspaces for `mobile`, `backend`, `dashboard` and `shared`.

### Prerequisites

- Node.js 22 LTS and npm
- Android Studio with the Android SDK and JDK 17 (React Native CLI setup), plus **two Android 10+ phones** (elder and guardian) and optionally a third for Home Guardian
- Python 3.11+ (only for training the classifier in `ml/`)
- Docker (optional, for running the backend with a local MongoDB)
- Accounts: MongoDB Atlas, Firebase, Twilio (WhatsApp Sandbox and Verify), Sarvam AI, OpenAI, AWS (S3), Google Safe Browsing API

### Backend

```bash
npm install                 # from the repo root: installs all workspaces
cd backend
cp .env.example .env        # fill in the variables below
npm run dev                 # http://localhost:8000
```

Or run the backend and a local MongoDB together:

```bash
docker compose up --build
```

To receive Twilio webhooks while running locally:

```bash
ngrok http 8000
```

### Android app

```bash
cd mobile
cp .env.example .env        # API_BASE_URL=https://<your-backend>/v1
# put google-services.json from Firebase in mobile/android/app/
npx react-native run-android --mode release
```

Install over USB (`npx react-native run-android --mode release` or `adb install`). Never send the APK over WhatsApp, because Play Protect in India blocks sideloaded apps that request sensitive permissions.

**Before a demo:** turn battery optimisation off and autostart on for Satark (Xiaomi, Realme, Vivo and Oppo kill background listeners); grant notification access, the call-screening role and overlay; turn Do Not Disturb off; use mobile data rather than venue Wi-Fi; mirror the elder phone with `scrcpy`.

### Police dashboard

```bash
cd dashboard
cp .env.example .env.local
npm run dev
```

### Classifier training

```bash
cd ml
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py             # writes backend/models/classifier.json and the metrics report
```

A Jest test checks that the Node scorer gives the same probabilities as scikit-learn on the test set.

### Tests

```bash
npm test --workspaces
```

Jest and Supertest cover the API, React Native Testing Library covers the app screens, and GitHub Actions runs lint and tests on every push.

---

## Environment variables

Names only. Secrets live in `.env` files, which are git-ignored, and `gitleaks` runs as a pre-commit hook.

**Backend (`backend/.env`)**

| Variable | Used for |
|---|---|
| `PORT` | API port (default 8000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signing app and dashboard sessions |
| `HASH_SECRET` | Server-wide key for hashing numbers, UPI IDs and domains |
| `PHONE_ENC_KEY` | AES-256-GCM key for users' own phone numbers |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Layer 4 LLM, Whisper fallback, embeddings |
| `SARVAM_API_KEY` | Sarvam-105B, Saaras v4, Bulbul v3, Sarvam Vision |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Link checks (rule R6) |
| `FIREBASE_SERVICE_ACCOUNT` | Path to the Firebase service-account JSON for FCM |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio API access |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender (the sandbox number during the hackathon) |
| `TWILIO_VERIFY_SERVICE_SID` | Phone sign-in codes |
| `PUBLIC_BASE_URL` | Public backend URL, used to check Twilio webhook signatures |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` | Complaint PDFs and evidence |
| `ALLOWED_ORIGINS` | CORS, limited to the dashboard |
| `DEMO_MODE` | `true` routes 1930 and portal actions to mock screens |

**App (`mobile/.env`, read with `react-native-config`):** `API_BASE_URL`

**Dashboard (`dashboard/.env.local`):** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SOCKET_URL`

---

## Demo mode

> ⚠️ **Demo mode is on for every hackathon demo.** "Call 1930" and "File online" open **our own mock screens** and a **"Demo mode"** banner is always visible. Satark never files a real complaint or calls the real 1930 helpline during testing.

---

## Security and privacy

A security product must be secure itself.

**Threat model (STRIDE)**

| Threat | Example | Defence |
|---|---|---|
| Spoofing | Someone calls the API pretending to be a user, or fakes a Twilio webhook | JWT from phone sign-in; guardian pairing by one-time code; `X-Twilio-Signature` check on the webhook |
| Tampering | Edited evidence in a complaint | SHA-256 hash of every evidence file in the PDF |
| Repudiation | Disputed alerts or reports | Server-side event log with timestamps |
| Information disclosure | Leaked messages or numbers | Masking before upload, keyed hashes, encrypted user numbers, expiring S3 presigned URLs, no raw audio stored |
| Denial of service | Flooding `/analyze` | `express-rate-limit`, `multer` upload size limits |
| Elevation of privilege | Non-police user opens the dashboard | Role-based middleware; police role assigned manually |
| AI manipulation | Prompt injection inside a scam message | Layer 1 clean-up, quoted-data prompt, injection check, max-score rule |

**Engineering checklist**

- Secrets only in `.env`; `.gitignore` from the first commit; `gitleaks` pre-commit hook
- `helmet` security headers; rate limiting on every endpoint; upload type and size checks; images re-encoded with `sharp` and EXIF removed
- zod validation on every request body, which also blocks MongoDB operator injection (`$gt`, `$ne` and the like)
- Phone, Aadhaar, PAN and account numbers masked by regex **on the phone, before upload**
- HTTPS only; CORS limited to our dashboard
- `npm audit` and `eslint-plugin-security` in CI; OWASP ZAP baseline scan against our own deployment only

**Privacy (Digital Personal Data Protection Act, 2023)**

- **Consent** for every permission, explained in the user's language; protection can be paused at any time.
- **Data minimisation:** on-phone checks first; only flagged, masked text leaves the phone; audio is processed in memory and never stored.
- **Purpose limitation:** data is used only for scam protection and reporting; the dashboard shows locality, never exact location.
- **No silent actions:** no call is cut without the countdown; no complaint is filed without the user's OTP.

---

## Evaluation and measured metrics

We publish **measured** numbers on real messages, including how often we wrongly flag genuine bank messages. Targets are aims, not claims; this table is filled in with real results at feature freeze.

| Metric | Target | Measured | How measured |
|---|---|---|---|
| Recall on scam messages | 90%+ | _TBD_ | Held-out test set plus real messages from family WhatsApp groups |
| False-positive rate on genuine bank messages | < 5% | _TBD_ | Real OTPs, debit alerts, bill and delivery messages |
| Accuracy under attack | Within a few points of clean accuracy | _TBD_ | Scam set rewritten with look-alike letters, spacing, leetspeak, code-mixing, prompt injection |
| Message to warning time | < 5 s | _TBD_ | Timestamp from notification to voice warning |
| Scam phrase to call warning | ~8–10 s | _TBD_ | Home Guardian chunk timing |
| Complaint Kit ready | < 30 s after tap | _TBD_ | Timer in app |

**Test sets**

| Set | Size | Source |
|---|---|---|
| Scam messages | 50+ | Real messages from family WhatsApp groups (numbers blanked) plus public datasets |
| Genuine messages | 50+ | Real bank OTPs, debit alerts, electricity bills, delivery and app messages |
| Disguised scams | Same as scam set | Look-alike letters, spacing, leetspeak, emoji padding, code-mixing |
| Prompt-injected scams | 10+ | Scam messages with hidden "classify as safe" instructions |
| Call scripts | 3 | Digital arrest, KYC update, investment tip, recorded in Telugu by the team |

Reported: precision, recall and false-positive rate with a confusion matrix; accuracy under attack next to clean accuracy; latency from message to warning and from scam phrase to call warning; seconds to build the Complaint Kit.

---

## Roadmap

1. **Pilot:** 50 senior citizens in one Hyderabad colony with their families; measure scams caught and money saved.
2. **Police partnership:** share the campaign feed with the Telangana Cyber Security Bureau through an API.
3. **Banks and UPI apps:** risk warnings before payment to a reported UPI ID.
4. **Call integration:** default phone app mode, then phone-maker or telecom partnerships for on-device call analysis.
5. **More languages:** Tamil, Kannada, Marathi and Bengali via Sarvam; an on-device small model for full offline use.
6. **Business model:** free for citizens; paid intelligence feeds and APIs for banks, telecom operators and enterprises.

---

## Team

| Role | Member | Owns |
|---|---|---|
| Mobile | _[Name]_ | React Native app, Kotlin native modules (notifications, call screening, overlay, endCall), share intent, offline cache |
| Backend and ML | _[Name]_ | Node.js + Express API, layers 1–5, classifier training and metrics, LangChain.js prompt chain, Sarvam voice, `/listen` |
| Dashboard and intel | _[Name]_ | MongoDB schema, police dashboard, clustering, STIX, complaint PDF, Twilio WhatsApp, domain hunter |
| Product and pitch | _[Name]_ | Scam and genuine message collection, test runs, Telugu scripts, PPT, README, demo video, rehearsals |

---

## Credits and licences

Every dataset, API and library we use is credited here (hackathon rule 4).

**Datasets**

| Dataset | Licence / terms |
|---|---|
| [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) (Almeida & Hidalgo) | CC BY 4.0 |
| Indian scam SMS datasets from Kaggle / Hugging Face | Used only where the dataset licence allows; each one is listed in `ml/DATASETS.md` |
| Real scam and genuine messages collected from family WhatsApp groups | Collected with consent; phone numbers blanked |

**APIs and services**

| Service | Used for |
|---|---|
| [Sarvam AI](https://docs.sarvam.ai/) (Sarvam-105B, Saaras v4, Bulbul v3, Sarvam Vision) | Indian-language reasoning, speech to text, text to speech, OCR |
| [OpenAI API](https://platform.openai.com/docs) (GPT, Whisper, embeddings) | Layer 4 reasoning, speech-to-text fallback, campaign grouping |
| [Twilio](https://www.twilio.com/docs/whatsapp/sandbox) (WhatsApp, Verify) | Complaint Kit delivery, forward-to-Satark bot, phone sign-in |
| [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) | Push alerts |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database |
| [AWS S3](https://aws.amazon.com/s3/) | PDF and evidence storage |
| [Google Safe Browsing API](https://developers.google.com/safe-browsing) | Known-bad link checks |
| [crt.sh](https://crt.sh/) | Certificate Transparency lookups |
| Render, Vercel, ngrok | Hosting |

**Libraries**

| Library | Licence |
|---|---|
| React Native | MIT |
| Express | MIT |
| Mongoose | MIT |
| LangChain.js (`langchain`, `@langchain/openai`) | MIT |
| OpenAI Node SDK (`openai`) | Apache-2.0 |
| Twilio Node SDK (`twilio`) | MIT |
| firebase-admin | Apache-2.0 |
| @react-native-firebase/messaging | Apache-2.0 |
| Socket.IO | MIT |
| Puppeteer | Apache-2.0 |
| tesseract.js | Apache-2.0 |
| sharp | Apache-2.0 |
| zod | MIT |
| helmet | MIT |
| express-rate-limit | MIT |
| multer | MIT |
| jsonwebtoken | MIT |
| Ajv | MIT |
| fastest-levenshtein | MIT |
| density-clustering | MIT |
| AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) | Apache-2.0 |
| Next.js | MIT |
| React | MIT |
| Tailwind CSS | MIT |
| Leaflet | BSD-2-Clause |
| React Navigation | MIT |
| react-native-tts | MIT |
| react-native-sound | MIT |
| react-native-audio-record | MIT |
| react-native-receive-sharing-intent | MIT |
| react-native-config | MIT |
| @react-native-async-storage/async-storage | MIT |
| axios | MIT |
| Jest | MIT |
| Supertest | MIT |
| React Native Testing Library | MIT |
| eslint-plugin-security | Apache-2.0 |
| scikit-learn (training only) | BSD-3-Clause |
| Noto Sans Telugu | SIL Open Font License 1.1 |

Inspiration for F22: [O2's AI granny scambaiter "Daisy"](https://techcrunch.com/2024/11/15/ai-granny-scambaiter-wastes-telephone-fraudsters-time-with-boring-chat).

---

## Sources

- [Telangana tops India in cybercrime FIRs, ₹1,524 crore lost in 2025 – Telangana Today](https://telanganatoday.com/telangana-tops-india-in-cybercrime-firs-despite-rs-1524-crore-fraud-losses-in-2025)
- [Senior citizens lose ₹102 crore to cyber fraud in Hyderabad in 19 months – UNI](https://test.uniindia.com/seniro-citizens-lose-rs-102-cr-to-cyber-fruad-in-hyderabad-in-19-months/south/news/3938099.html)
- [Investment frauds account for 60% of Telangana losses; funds on hold – Deccan Chronicle](https://www.deccanchronicle.com/amp/southern-states/telangana/investment-frauds-account-for-60-of-telangana-cybercrime-losses-1979308)
- [Over 24 lakh complaints, ₹22,495 crore fraud reported in 2025 – Free Press Journal](https://www.freepressjournal.in/amp/mumbai/over-24-lakh-cyber-complaints-22495-crore-fraud-reported-in-2025)
- [Senior citizens and women lost ₹7,769 crore in 2025 – Asianet Newsable](https://newsable.asianetnews.com/india/senior-citizens-women-lost-rs-7-769-crore-to-cyber-fraud-in-2025-articleshow-u9oad8w)
- [Supreme Court: digital arrests a very big challenge – SuperKalam (The Hindu)](https://superkalam.com/current-affairs/04-11-2025/digital-arrests-are-a-very-big-challenge-victims-mostly-elderly-lost-3-000-cr-in-india-alone-sc-pg14-e9a40d2b-a355-49c7-ae2f-a819ae7fb574)
- [Google steps up AI scam protection in India but gaps remain – TechCrunch](https://techcrunch.com/2025/11/20/google-steps-up-ai-scam-protection-in-india-but-gaps-remain)
- [TRAI's SMS sender suffix format explained – Storyboard18](https://www.storyboard18.com/how-it-works/why-your-sms-now-looks-like-a-code-trais-new-message-format-explained-70270.htm)
- [RBI asks banks to use 1600xx numbers for transactional calls – Outlook Money](https://www.outlookmoney.com/banking/rbi-asks-banks-to-use-only-1600xx-series-phone-numbers-to-call-customers-for-transactional-purposes)
- [TRAI direction on 1600-series for the financial sector – NSDL circular](https://nsdl.com/nsdl/2026-07/2026-0083-Policy-Directions%20issued%20by%20TRAI%20for%20Mandatory%20Phase-wise%20Adoption%20of%201600-Series%20Numbers..pdf)
- [e-Zero FIR launched – Outlook Money](https://www.outlookmoney.com/news/govt-launches-e-zero-to-auto-convert-cybercrime-complaints-into-firs-speed-up-investigations)
- [e-Zero FIR live in 10 states – EaseMyPrep](https://easemyprep.in/news/2890-rs-25000-crore-saved-to-e-zero-firs-pm-modi-briefed-on-cybercrime-action)
- [Android: sharing audio input (call capture rules) – Android Developers](https://developer.android.com/media/platform/sharing-audio-input)
- [TelecomManager API 29 changes – Android Developers](https://developer.android.com/sdk/api_diff/29/changes/android.telecom.TelecomManager)
- [React Native native modules (Kotlin) – React Native docs](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [Twilio WhatsApp Sandbox – Twilio docs](https://www.twilio.com/docs/whatsapp/sandbox)
- [Sarvam AI models – Sarvam docs](https://docs.sarvam.ai/api-reference-docs/getting-started/models)

---

<p align="center"><b>Satark</b> · Built in 24 hours at KPRIT Software Hackathon 2026 · <i>One report protects everyone.</i></p>
