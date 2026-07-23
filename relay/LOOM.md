# Loom script — Sherlock Internal Tools (3–5 min)

Send to **admin@imsherlock.com**. Goal: show **process**, not a silent UI tour.

## Before you hit record

```bash
cd relay && npm run dev
```

1. Open `http://localhost:3000` at **1440×900** (or similar).
2. Leave the **Loom teleprompter** open (bottom-right). Optional: hit **Play demo** for autoplay, or drive manually.
3. On Pulse, leave **Live** on so the ticker streams during your open.
3. Close Slack/email noise. Speak to camera 20–30% of the time; screen the rest.
4. Target **~4:00**. Hard stop at 5:00.

## What they’re hiring for (hit these signals)

| Signal | Where you show it |
| --- | --- |
| Understands Beige / internal ops | Pulse framing + route names match their domains |
| Backend > pretty UI | Systems: entities, HMAC webhook, attribution |
| AI-native shipping | Explicit process beats on Systems |
| High agency | Week-one ships — you propose, don’t wait |
| Speed | Live stage moves, not Figma |

## Minute-by-minute

### 0:00–0:40 — Problem (Pulse)
**Say:** You’re applying for Internal Tools / Beige. You built **Relay** as a compressed command center for the creator loop Sherlock already runs — because ops dies when outreach, CRM, roster, and money disagree.

**Do:** Point at the four KPIs (views, installs, web visits, revenue).

### 0:40–1:20 — Outcome loop (Pulse)
**Say:** After the web pivot, installs alone aren’t enough — unique web visits matter too. Attribution is the product.

**Do:** Hover Views→Installs, then Revenue. Mention competitor SoV only if you have 5 seconds.

### 1:20–2:00 — Outreach
**Say:** Top of funnel isn’t a spreadsheet — it’s owned stages to a booked call.

**Do:** Drag a card to the next column (or hit Book call). Edit a note. Mention ⌘K jump.

### 2:00–2:40 — CRM
**Say:** Onboarding must stay live across systems. Web flow steps should land via **HMAC-signed webhooks** into this record.

**Do:** Advance a creator stage. Point at the webhook callout on the detail panel.

### 2:40–3:15 — Roster
**Say:** Live creators = cadence + standing. Under-posting should surface before payroll drama.

**Do:** Sort by revenue. Point at a yellow/red fulfillment bar (watch / at-risk).

### 3:15–3:50 — Financials
**Say:** Payroll queue + attribution side by side — who drove installs vs web, what’s held.

**Do:** Click Process queued batch or Mark paid / Hold. Show the toast.

### 3:50–4:40 — Systems + process (close here)
**Say:**
1. Ops model before pixels (entities/stages).
2. Seeded realistic failure modes (holds, no-shows, at-risk).
3. AI coding tools for speed; judgment on webhook/attribution semantics.
4. Week-one on Beige: attribution joins, webhook hardening, at-risk Slack cron.

**Do:** Scroll entities → webhook contract → week-one list. Look at camera for the close.

### Optional 4:40–5:00
One sharp idea: “I’d make Beige the source of truth for bot copy + stage transitions so the Slack fleet can’t drift from the UI.”

## Closing line (use this)

> “I ship AI-native and backend-heavy. Relay is how I think about Beige — one loop, honest attribution, and integrations that keep ops in sync. Excited for the paid trial.”

## Don’t

- Don’t apologize for seed data.
- Don’t narrate every pixel (“here’s a button”).
- Don’t spend >20s on typography/fonts.
- Don’t end on Outreach — end on **Systems / week-one**.

## Subject line for email

`Loom — Internal Tools / Beige — Relay walkthrough`
