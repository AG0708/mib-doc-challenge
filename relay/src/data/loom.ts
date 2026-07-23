export type LoomBeat = {
  id: string;
  minute: string;
  title: string;
  href: string;
  say: string;
  do: string;
  signal: string;
};

/** Timed beats for a 3–5 min Sherlock hire Loom. */
export const LOOM_BEATS: LoomBeat[] = [
  {
    id: "problem",
    minute: "0:00",
    title: "Problem",
    href: "/",
    say: "Creator ops breaks when outreach, CRM, roster, and money live in different tabs. Beige is the command center — Relay is my compressed model of that loop.",
    do: "Stay on Pulse. Point at the four KPIs.",
    signal: "Shows you understand the role, not a consumer UI.",
  },
  {
    id: "loop",
    minute: "0:40",
    title: "Outcome loop",
    href: "/",
    say: "The only metric that matters is the chain: views → installs → unique web visits → revenue. Vanity views without attribution is noise.",
    do: "Hover the Views→Installs chart, then Revenue pulse.",
    signal: "Matches Sherlock’s web pivot + RevenueCat-style thinking.",
  },
  {
    id: "outreach",
    minute: "1:20",
    title: "Outreach",
    href: "/outreach",
    say: "Top of funnel is a board with ownership. I model stages the ops team actually runs — sourced to booked call — not a generic CRM.",
    do: "Click a prospect. Move them one stage. Call out owner + score.",
    signal: "Ship-fast interaction > static mock.",
  },
  {
    id: "crm",
    minute: "2:00",
    title: "CRM + webhooks",
    href: "/crm",
    say: "Onboarding can’t drift. Web signup steps should HMAC-verify into this record so managers see live state across systems.",
    do: "Open a creator. Advance a stage. Point at the webhook callout.",
    signal: "Backend/integration instinct — what the hire asks for.",
  },
  {
    id: "roster",
    minute: "2:40",
    title: "Roster",
    href: "/roster",
    say: "Once live, it’s cadence and standing. Under-posting should surface before payroll, not after a Slack panic.",
    do: "Sort by revenue. Point at a watch/at-risk fulfillment bar.",
    signal: "Ops empathy — tools the team uses daily.",
  },
  {
    id: "money",
    minute: "3:15",
    title: "Financials",
    href: "/financials",
    say: "Payroll is only half. Attribution is the other — who drove installs vs web visits, what’s queued, what’s on hold.",
    do: "Filter payout statuses. Point at attribution bars.",
    signal: "Financial tracking as a first-class surface.",
  },
  {
    id: "systems",
    minute: "3:50",
    title: "Systems + process",
    href: "/systems",
    say: "Built AI-native: I scoped entities first, seeded realistic ops data, then iterated UI against workflows. Here’s the model, webhook contract, and what I’d ship week one on Beige.",
    do: "Scroll entities → webhook → week-one. End on high-agency ideas.",
    signal: "Process, not just output — exactly what the Loom asks for.",
  },
];
