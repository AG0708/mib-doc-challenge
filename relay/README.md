# Relay — Creator Ops (Sherlock-ready)

Internal command center for creator outreach, CRM, roster, financials, and attribution.

**This is a real app:** SQLite database + REST APIs + HMAC webhooks. Same schema ships as a Supabase migration so Sherlock can adopt it.

## Stack

- Next.js · React · TypeScript · Tailwind · Recharts · SWR
- **Drizzle ORM + SQLite** (local durable DB at `data/relay.db`)
- **Supabase Postgres schema** in `supabase/migrations/001_init.sql`
- HMAC webhook ingress at `POST /api/webhooks/onboarding`

## Run

```bash
cd relay
npm install
npm run dev
```

Open http://localhost:3000

First boot creates and seeds `data/relay.db`.

## API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET/PATCH/POST | `/api/prospects` | Outreach CRM |
| GET/PATCH | `/api/creators` | Creator pipeline / roster |
| GET/PATCH | `/api/payouts` | Payroll ledger |
| GET | `/api/metrics` | Pulse totals + charts |
| GET | `/api/activity` | Activity + webhook inbox |
| POST | `/api/webhooks/onboarding` | HMAC-signed onboarding events |

## Hand off to Sherlock / Supabase

1. Run `supabase/migrations/001_init.sql` in your Supabase project.
2. Set `RELAY_WEBHOOK_SECRET` (defaults to `relay_dev_secret` in local).
3. Point web onboarding at `/api/webhooks/onboarding` with `X-Relay-Signature: sha256=<hmac>`.
4. Swap the Drizzle SQLite driver for `drizzle-orm/postgres-js` (or Supabase client) using the same table shapes.
5. Replace seed metrics with RevenueCat + PostHog joins into `daily_metrics`.

## Loom (application video)

See `LOOM.md`. Product UI is ops-first; open Systems and fire a signed webhook on camera.

## Env

```bash
RELAY_WEBHOOK_SECRET=relay_dev_secret
RELAY_DB_PATH=./data/relay.db   # optional
```
