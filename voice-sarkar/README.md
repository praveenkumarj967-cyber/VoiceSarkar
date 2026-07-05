# Voice Sarkar — Real Backend

This replaces the browser-only demo with a backend that actually answers phone
calls, runs a real dialogue engine, and can genuinely take a call from a real
citizen through to a filed (currently mock) complaint with an SMS confirmation.

## What is genuinely real here vs. what still needs approval

**Works today, with your own credentials, no government sign-off needed:**
- Real inbound call handling via Twilio (or any SIP/Twilio-compatible provider)
- Real dialogue engine: intent detection, slot-filling, confirmation
- Real Bhashini ASR/Translation/TTS calls (once you have API credentials)
- Real Postgres storage of citizens, calls, conversation turns, complaints,
  notifications, audit trail
- Real SMS confirmation via Twilio
- Admin API for a dashboard (complaint list, status counts)

**Explicitly mocked — needs a formal path before going further:**
- Actual submission to CPGRAMS / RTI Online / state portals / DISCOM systems.
  `PORTAL_MODE=mock` (the default) files the complaint in *our* database with
  a generated reference and does not contact any government system. See
  `app/portals/rpa_adapter.py` for why browser automation is a last resort,
  not a starting point, and what approvals it needs before you touch it.
- Live status polling from real portals (currently randomised for demo realism
  in the mock adapter — remove that once a real status source exists).

Don't present this system to citizens as filing real complaints until the
portal integration is real. Right now it is honest as a working *intake and
triage* system with a stubbed-out submission backend.

## 1. Local setup

```bash
cp .env.example .env
# edit .env: fill in TWILIO_*, BHASHINI_*, ADMIN_API_KEY

docker compose up --build
```

The API listens on `http://localhost:8000`. Check `GET /healthz`.

## 2. Expose it to Twilio (local dev)

Twilio needs to reach your webhook over HTTPS. For local development:

```bash
ngrok http 8000
```

Copy the `https://xxxx.ngrok-free.app` URL into `.env` as `PUBLIC_BASE_URL`,
then restart the `api` service so it picks up the new value.

## 3. Configure your Twilio number

1. Buy a number in the [Twilio Console](https://console.twilio.com) — for a
   real deployment you'll want an Indian toll-free number, which requires
   Twilio's India regulatory bundle (business KYC documents) before it goes
   live for inbound traffic from Indian carriers.
2. Under the number's **Voice Configuration**, set "A call comes in" to:
   `https://<PUBLIC_BASE_URL>/voice/incoming` (HTTP POST)
3. Set the **Call status changes** webhook to `/voice/status-callback`.
4. Call the number. You should hear the greeting and be able to speak back.

**India SMS note:** Sending SMS from India (or to Indian numbers, depending on
route) generally requires Telecom Regulatory Authority of India (TRAI) DLT
(Distributed Ledger Technology) registration of your sender entity and message
templates. Twilio's India SMS docs walk through this — budget time for it,
it isn't instant.

## 4. Bhashini credentials

1. Register at [bhashini.gov.in](https://bhashini.gov.in), open **My Profile**,
   generate a ULCA API key.
2. Put `BHASHINI_USER_ID` and `BHASHINI_ULCA_API_KEY` in `.env`.
3. `BHASHINI_PIPELINE_ID` in `.env.example` is a commonly-cited public sample
   value — confirm the current pipeline ID for your use case from the ULCA
   portal rather than assuming it's still valid; Bhashini adds/rotates
   pipelines over time.
4. `app/bhashini_client.py` implements the real two-step ULCA contract:
   Pipeline Config call (resolves serviceIds + the actual compute endpoint)
   then Pipeline Compute call (does the ASR/translation/TTS). Twilio's own
   `<Gather input="speech">` already handles English well; wire Bhashini in
   via the `<Record>` + `speech_to_text()` path (see `build_record_response`
   in `app/telephony.py`) for languages you want Bhashini's models to handle
   instead of Twilio's built-in recognizer.

## 5. Try the admin API

```bash
curl -H "x-api-key: <ADMIN_API_KEY>" http://localhost:8000/admin/stats
curl -H "x-api-key: <ADMIN_API_KEY>" http://localhost:8000/admin/complaints
```

Point a real dashboard (or the earlier browser demo, adapted) at these.

## 6. Before this touches real citizens

This is a functioning skeleton, not a compliant national system. At minimum,
before any real rollout you still need:

- **Legal basis & consent language** reviewed against India's Digital
  Personal Data Protection Act, 2023 — what you record, how long you keep
  call audio/transcripts, and what the caller is told at the start of the call.
- **A real government partnership** for each portal you intend to submit to
  — CPGRAMS is run by DARPG; state portals by each state's IT/e-governance
  department; RTI Online by DoPT; electricity/water by the respective
  utility. There's no shortcut around this for genuine, reliable submission.
- **Proper secrets management** (this repo's `.env` approach is for dev only
  — use a secrets manager in production).
- **Authn/authz on the admin API** beyond a single shared API key — real
  RBAC for call-center operators vs. district officers vs. state admins.
- **Load testing and multi-region failover** if you're targeting anything
  near national call volumes — this single-instance docker-compose stack is
  for development, not 10 million calls/day.
- **Human escalation path** for low-confidence intents, angry callers, or
  anything the dialogue engine can't resolve — there's a stub for this
  ("would you like to file another complaint...") but no live transfer to a
  human operator yet.
