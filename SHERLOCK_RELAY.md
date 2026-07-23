# Sherlock portfolio: Relay (Loom-optimized)

`relay/` is a Next.js creator command center demo for the Sherlock **Internal Tools / Beige** hire.

**Fully connected backend:** every surface reads/writes SQLite via `/api/*` (Drizzle). Convert prospect→creator, generate payouts, ingest metrics, server-signed webhook simulate, team/operator from DB. No client fake stores.

**For the application Loom:** see `relay/LOOM.md` (3–5 min script).

```bash
cd relay
rm -rf .next
# optional after schema pulls: rm -f data/relay.db data/relay.db-*
npm install && npm run dev
```

Does not change the MIB Doc Challenge contract.
