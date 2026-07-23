# Relay — Sherlock Internal Tools Loom demo

Built specifically for the **Sherlock Engineering Hire (Internal Tools)** application Loom: walk through **approach → product → process** in 3–5 minutes.

**Stack:** Next.js · React · TypeScript · Tailwind · Recharts · Framer Motion  
Seed data mirrors Supabase-shaped tables (no keys required).

## Record in 60 seconds

```bash
cd relay
npm install
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000)
2. Keep the **Loom teleprompter** visible (bottom-right) — it tells you what to say/do per beat
3. Follow **[LOOM.md](./LOOM.md)** (minute-by-minute script)
4. End on **Systems** (entities, HMAC webhook, week-one ships)

Email the Loom to `admin@imsherlock.com`.

## Routes (video path)

| Order | Route | Beat |
| --- | --- | --- |
| 1 | `/` Pulse | Problem + views→installs→web→revenue |
| 2 | `/outreach` | Funnel ownership, live stage move |
| 3 | `/crm` | Onboarding pipeline + webhook callout |
| 4 | `/roster` | Cadence / standing |
| 5 | `/financials` | Payroll + attribution |
| 6 | `/systems` | **Process close** — model, contracts, week-one |

## Hire signals this demo is built to hit

- **Beige-shaped domains** — outreach, CRM, roster, financials, intel  
- **Backend-first** — Systems page shows entities, HMAC onboarding webhook, attribution sketch  
- **AI-native process** — teleprompter + LOOM.md narrate how it was scoped and shipped  
- **High agency** — concrete week-one ships on their stack (Supabase, RevenueCat, Slack cron)

## What production would add

Supabase Auth/RLS · Realtime stage updates · RevenueCat/PostHog joins · Slack bot fleet config · idempotent webhook inbox
