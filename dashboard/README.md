# Satark police dashboard

Next.js 16 (App Router, Turbopack) + Tailwind CSS 4, a client-side app on top of the Satark API. Police role only.

```bash
npm run dev --workspace dashboard     # http://localhost:3000 (the API must be running on :8000)
npm run build --workspace dashboard   # production build (standalone output)
```

Set `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/v1`) in `dashboard/.env.local` to point at another API. Demo sign-in: **+91 90000 00001**, code **123456**.

## Pages

| Route | What it is for |
|---|---|
| `/` Command centre | KPI tiles, golden-hour countdowns, live scam map (Leaflet + OpenStreetMap), live feed, reports over time, active campaigns, most-reported identifiers, scam weather |
| `/cases` | The case queue filed by Satark; the drawer shows evidence hashes, the Complaint Kit PDF, the FIR tracker and every automated message. Moving a case to the next stage WhatsApps the family |
| `/analyzer` | Explainable AI: every layer's score against the 40 / 70 lines, Kill Chain quotes, the rules that fired and why, the classifier's n-grams, the explanation in English, Telugu and Hindi |
| `/intel` | Hashed indicator lookup, add a confirmed indicator, STIX 2.1 export, crt.sh domain hunter, campaigns |
| `/outbox` | Every WhatsApp message, push and bank letter Satark sent (or recorded, in demo mode) |

## Live behaviour

- One Socket.IO connection (`lib/realtime.tsx`) feeds every page. Feed events refresh the panels (debounced to every 2 seconds).
- **Critical** events (golden-hour cases, unanswered alerts, live-call cuts) sound a short siren made with the Web Audio API, raise a toast, and stay in a flashing banner until an officer presses **Acknowledge**. Browsers keep sound locked until the first click, so the header shows **Enable alarm sound** until then; the mute choice is remembered.
- The **Demo** menu in the header runs the storylines, toggles the live traffic simulator and resets the demo data.

## Charts and colour

Colours come from the dataviz reference palette's dark steps, validated against the panel surface with the palette validator:

- Six scam types own fixed categorical slots (investment, digital arrest, bank/KYC, electricity, courier, APK); everything else folds into a gray "Other". Colour follows the scam type, never its rank.
- The map is an all-pairs view, so only the first three types keep their colour there.
- Status colours (critical, warning, good) are reserved for severity and always come with an icon and a label.

`reactStrictMode` is off because react-leaflet layers do not survive React's development-only double mount; production behaviour is unaffected.
