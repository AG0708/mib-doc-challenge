# Loom script — Sherlock Internal Tools (3–5 min)

Product is a **real** ops app (SQLite + APIs + HMAC webhooks). Show process *and* that it writes to a DB.

## Before record

```bash
cd ~/mib-doc-challenge && git pull
cd relay
rm -rf .next
npm install
npm run dev
```

Open http://localhost:3000 at ~1440×900.

## Beat sheet (~4:00)

### 0:00 — Problem (Pulse)
“Creator ops dies when outreach, CRM, and money disagree. Relay is a Beige-shaped command center on a real database.”

Point at Live DB badge + KPIs.

### 0:45 — Attribution (Pulse)
Views → installs → web visits → revenue. Refresh proves `/api/metrics`.

### 1:20 — Outreach
Drag a prospect or Book call. Say: “PATCH `/api/prospects` — persists to SQLite.”

### 2:00 — CRM
Advance a creator stage. Mention deep link + webhook sync.

### 2:40 — Roster / Financials
Change standing or Mark paid. Show it sticks after refresh.

### 3:20 — Systems (close)
Architecture: UI → /api → DB.  
**Send signed webhook** — show JSON response + inbox row + CRM stage change.  
Hand-off: `supabase/migrations/001_init.sql`.

### Close
“AI-native shipping, backend-heavy. Ready for a paid trial on Beige.”

Email: admin@imsherlock.com  
Subject: `Loom — Internal Tools / Beige — Relay`
