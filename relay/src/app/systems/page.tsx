import { PageHeader, SectionTitle, Badge } from "@/components/ui/primitives";

const ENTITIES = [
  {
    name: "prospects",
    role: "Outreach funnel row",
    fields: "stage · owner · score · last_touch · niche",
  },
  {
    name: "creators",
    role: "CRM + roster source of truth",
    fields: "crm_stage · standing · rate · manager · cadence",
  },
  {
    name: "content_events",
    role: "Post / view facts (PostHog + scrapers)",
    fields: "creator_id · platform · views · posted_at · hook_id",
  },
  {
    name: "attribution_daily",
    role: "Join content → installs / web → $",
    fields: "creator_id · installs · web_visits · revenue · date",
  },
  {
    name: "payouts",
    role: "Payroll ledger",
    fields: "period · amount · status · hold_reason",
  },
  {
    name: "webhook_inbox",
    role: "Onboarding + bot ingress",
    fields: "source · hmac · payload · applied_at",
  },
];

const WEEK_ONE = [
  {
    title: "Instrument attribution joins",
    detail:
      "Map creator deep links → RevenueCat installs + unique web visits. Ship a daily rollup table Beige already assumes exists.",
  },
  {
    title: "Harden onboarding webhooks",
    detail:
      "HMAC verify, idempotency keys, and stage writes back into CRM so Slack bots and managers never disagree.",
  },
  {
    title: "At-risk cadence alerts",
    detail:
      "Cron: under-posting + standing drop → Slack DM to manager with one deep link into the creator record.",
  },
];

export default function SystemsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Process · Systems"
        title="How I’d wire Beige."
        description="Backend-first walkthrough: entities, the onboarding webhook contract, attribution math, and the first three ships I’d push on your stack."
      />

      <section className="panel animate-rise mb-5 rounded-2xl p-5">
        <SectionTitle title="Build process (AI-native)" />
        <ol className="space-y-3 text-sm leading-relaxed text-ink-soft">
          <li>
            <span className="font-semibold text-ink">1. Ops model before pixels. </span>
            Mapped Sherlock’s Beige domains (outreach → CRM → roster → financials → intel) into typed entities and stage machines.
          </li>
          <li>
            <span className="font-semibold text-ink">2. Seed reality, not lorem. </span>
            Fake creators with rates, holds, no-shows, and competitor SoV so every screen has a decision attached.
          </li>
          <li>
            <span className="font-semibold text-ink">3. Iterate with AI on workflows. </span>
            Used an AI coding loop to scaffold Next/Tailwind/Recharts fast, then spent judgment on stage semantics, attribution, and webhook shape — the parts that matter for this hire.
          </li>
          <li>
            <span className="font-semibold text-ink">4. Optimize for the Loom. </span>
            Teleprompter beats encode what to say/do so the video shows process, not a silent UI scroll.
          </li>
        </ol>
      </section>

      <section className="panel animate-rise mb-5 rounded-2xl p-5" style={{ animationDelay: "60ms" }}>
        <SectionTitle title="Core entities (Supabase-shaped)" />
        <div className="grid gap-2 md:grid-cols-2">
          {ENTITIES.map((e) => (
            <div
              key={e.name}
              className="rounded-xl border border-line bg-white/65 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="mono text-sm font-semibold text-ink">{e.name}</p>
                <Badge>table</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{e.role}</p>
              <p className="mono mt-2 text-[11px] text-muted">{e.fields}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <section className="panel animate-rise rounded-2xl p-5" style={{ animationDelay: "100ms" }}>
          <SectionTitle title="Onboarding webhook contract" />
          <pre className="mono overflow-x-auto rounded-xl border border-line bg-ink px-4 py-3 text-[11px] leading-relaxed text-white/90">
{`POST /api/webhooks/onboarding
X-Relay-Signature: sha256=<hmac>

{
  "event": "step.completed",
  "creator_id": "c6",
  "step": "payment_connected",
  "occurred_at": "2026-07-22T14:28:00Z",
  "idempotency_key": "ob_c6_pay_01"
}

→ verify HMAC
→ upsert creators.stage = onboarding|first_post|…
→ append webhook_inbox
→ fan-out Slack bot if stalled > 24h`}
          </pre>
          <p className="mt-3 text-sm text-muted">
            Same pattern as Sherlock’s web onboarding → creator pipeline. UI is the
            read model; the webhook is the write path.
          </p>
        </section>

        <section className="panel animate-rise rounded-2xl p-5" style={{ animationDelay: "140ms" }}>
          <SectionTitle title="Attribution sketch" />
          <pre className="mono overflow-x-auto rounded-xl border border-line bg-ink px-4 py-3 text-[11px] leading-relaxed text-white/90">
{`for each creator, day d:
  views      = sum(content_events.views)
  installs   = RevenueCat events w/ creator deep link
  web_visits = unique web sessions w/ same link
  revenue    = installs * ARPU
             + web_visits * web_conversion_value

CPM_eff = revenue / (views / 1000)
flag if posts_done/posts_due < 0.5
     or CPM_eff << cohort median`}
          </pre>
          <p className="mt-3 text-sm text-muted">
            Financials in Relay charts this rollup. Production join lives in
            Supabase + PostHog/RevenueCat, not in the React tree.
          </p>
        </section>
      </div>

      <section className="panel animate-rise mb-5 rounded-2xl p-5" style={{ animationDelay: "180ms" }}>
        <SectionTitle title="Week-one ships on Beige" />
        <div className="space-y-3">
          {WEEK_ONE.map((item, i) => (
            <div
              key={item.title}
              className="flex gap-3 rounded-xl border border-line bg-white/65 px-3 py-3"
            >
              <span className="mono text-sm font-semibold text-signal-deep">
                0{i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel animate-rise rounded-2xl p-5" style={{ animationDelay: "220ms" }}>
        <SectionTitle title="Stack fit" />
        <p className="text-sm leading-relaxed text-ink-soft">
          Next.js · React · Tailwind · Recharts for the command UI. Seeded like
          Supabase Postgres tables so swapping in Auth, RLS, Edge Functions, and
          Realtime is mechanical — not a rewrite. Slack bots / cron stay as
          Node workers writing the same tables this UI reads.
        </p>
      </section>
    </div>
  );
}
