# Relay — Creator Command Center

Portfolio demo built for the **Sherlock Engineering Hire (Internal Tools)** role — a Beige-shaped ops surface for recruiting, onboarding, managing, and paying creators, with content performance tied to installs, web visits, and revenue.

**Stack:** Next.js · React · TypeScript · Tailwind CSS · Recharts · Framer Motion

No Supabase keys required. Seed data mirrors the tables/entities you'd wire to Postgres.

## Why this exists

Sherlock's internal systems (especially Beige) own the creator loop:

1. **Outreach** — source → contact → reply → booked call  
2. **CRM** — signed → onboarding → first post → live  
3. **Roster** — cadence, terms, standing for active creators  
4. **Financials** — payroll + attribution (views → installs / web → revenue)  
5. **Pulse** — live metrics + competitor share of voice  

Relay is a dense, shippable slice of that product so you can Loom the *process*: modeling the ops problem, choosing the stack, and iterating UI against real workflows.

## Run locally

```bash
cd relay
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm start
```

## Routes

| Route | Job |
| --- | --- |
| `/` | Pulse — KPIs, funnel charts, SoV, ops feed |
| `/outreach` | Kanban prospecting board with stage moves |
| `/crm` | Pipeline table + stage transitions |
| `/roster` | Active creator management / standing |
| `/financials` | Payout ledger + attribution charts |

## Design notes

- Brand-first shell: **Relay** is the product name, not a nav afterthought  
- Cool paper atmosphere (grid + gradients) — not flat white, not default purple AI chrome  
- Expressive type: Syne + Figtree + JetBrains Mono  
- Motion on nav, board cards, and staggered section entrance  

## What you'd wire next (production)

- Supabase Auth + RLS for ops roles  
- Real creator / prospect tables + Realtime for stage changes  
- HMAC webhook inbox from web onboarding  
- RevenueCat + PostHog event joins for attribution  
- Slack bot hooks for at-risk creators and payroll batches  

## Loom script (3–5 min)

1. Open Pulse — explain the views → installs → web → revenue loop  
2. Move a prospect on Outreach — show funnel ownership  
3. Advance someone in CRM — mention webhook sync from web onboarding  
4. Flag an under-posting creator on Roster  
5. Walk Financials attribution + payout statuses  
6. Close on what you'd ship in week one on Beige  

Built with AI coding tools as the daily driver — the point of the hire.
