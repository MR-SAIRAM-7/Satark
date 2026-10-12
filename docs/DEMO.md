# Demo run sheet

A seven-minute pitch with the elder's phone (mirrored with `scrcpy`) on one side of the screen and the police dashboard on the other. Demo mode is on throughout: nothing reaches 1930, the cybercrime portal, a real bank or a real WhatsApp number unless Twilio keys are deliberately configured.

## Before you go on stage (15 minutes)

1. `npm install`, then `npm run dev` on the presenter laptop. Wait for `Satark API listening on :8000` and the dashboard on :3000.
2. Dashboard: sign in as **+91 90000 00001**, code **123456**. Click **Enable alarm sound** once.
3. Dashboard **Demo → Reset demo data** so the golden-hour timers start fresh.
4. Phone: install the `preview` APK, set `EXPO_PUBLIC_API_BASE_URL=http://<laptop LAN IP>:8000/v1` in the EAS build (or use `npm run mobile:web` in a phone-sized browser window). Onboard as **Lakshmi Devi, +91 90000 00101, Kukatpally**, guardian **Ravi Kumar, +91 90000 00201**: the API links the phone to the seeded Lakshmi, so her son and her locality are already in the story.
5. Optional second phone: onboard it as **guardian, Ravi Kumar, +91 90000 00201**. Lakshmi's alerts appear on it live, and tapping one acknowledges it (no escalation). A spare phone can be the **Home Guardian**: onboard it in that role and type the code from **Settings → Pairing code** on Lakshmi's phone.
6. Optional live data: **Demo → Live traffic simulator ON** for a scam event every 10-25 seconds.

## Round 1: the scam arrives (phone, 2 minutes)

1. Phone: **Settings → Demo control room → Prompt-injection attack**, or paste the "Fake police message" example into **Is this safe?**
2. Point at: the red screen, the voice warning, the Kill Chain meter, "Reported by N other Satark users" (the number came from the community blocklist the phone synced), "Ravi Kumar has been alerted" (and, if you have the second phone, the alert arriving on it).
3. Dashboard: the check appears in the live feed and on the map at Kukatpally.
4. Dashboard **Explainable AI**: paste the same message (or pick **Disguised + prompt injection**). Show score = max(layers), the de-obfuscated quotes, R15 "hidden instructions aimed at AI filters", and the n-grams the classifier saw.

## Round 2: money leaves, the golden hour starts (dashboard, 2 minutes)

1. Dashboard **Demo → Golden hour**. In about 10 seconds: three scam messages for Lakshmi, then a ₹1.25 L debit.
2. The siren sounds and the red banner says "Money lost: ₹1,25,000 - golden hour running". A golden-hour countdown card appears; the case is at the top of **Case queue**.
3. Open the case: evidence with SHA-256 hashes, the Complaint Kit PDF (**Complaint Kit PDF** button), and **Automated messages** already sent to Lakshmi and Ravi.
4. Move it to **Bank hold**: the family gets the WhatsApp update and a freeze request to the bank's nodal officer is drafted. Show it on **Automated messages**.
5. Say what Satark will not do: it never files on cybercrime.gov.in or calls 1930 itself. That needs the victim's OTP; Satark prepares everything and tracks the case.

## Round 3: the call, and everyone else is protected (2 minutes)

1. Dashboard **Demo → Live call cut**: the Home Guardian hears a Telugu-English digital-arrest call; at stage 4 the elder's phone gets the CUT countdown, the dashboard alarm sounds.
2. Dashboard **Demo → Scam wave**: one UPI ID reported from five localities in ten seconds, confirmed at the third report, "now blocked before it rings on every Satark phone", grouped into a campaign.
3. **Threat intel → Export STIX 2.1 bundle**: the format CERT-In and other cyber cells import. Phone numbers leave only as hashes.
4. **Demo → Unanswered alert**: shows what happens when the family does not respond: reminder, then escalation to the cyber cell.

## Questions you will get

| Question | Short answer |
|---|---|
| Is it just ChatGPT? | No. Rules and our own classifier decide; the LLM can only raise the score, and it is optional. Score = max(layers). |
| What if the classifier is wrong? | On its own it can only say "suspicious"; a red alert needs a rule, the Kill Chain, the community or the LLM to agree. Metrics are in `ml/reports/metrics.md`, measured on a synthetic corpus and labelled as such. |
| Privacy? | Most messages never leave the phone. Only flagged, masked text is uploaded; scammer identifiers are hashed; users' numbers are encrypted; reports carry a locality, not a location; audio is never stored. |
| Can it file the FIR automatically? | It automates everything up to the victim's OTP: complaint text, evidence hashes, Zero FIR letter, PDF, case filing with the partner cyber cell, WhatsApp updates, golden-hour reminders and the bank freeze request. |
| Does it work offline? | Layers 1-2, the Kill Chain and the cached blocklist run on the phone with no network. |

## If something breaks

- Dashboard blank or "Connecting…": the API is not running; check the terminal running `npm run dev`.
- No alarm sound: click **Enable alarm sound**, check **Alarm on**.
- Map tiles missing (venue Wi-Fi blocks OpenStreetMap): the circles and live pulses still render; use mobile data.
- Start over: **Demo → Reset demo data**.
