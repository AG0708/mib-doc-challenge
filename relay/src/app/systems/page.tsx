import { PageHeader, SectionTitle, Badge, Button } from "@/components/ui/primitives";
import { ArchitectureMap } from "@/components/systems/ArchitectureMap";
import { WebhookConsole } from "@/components/systems/WebhookConsole";
import Link from "next/link";

const ENTITIES = [
  {
    name: "prospects",
    role: "Outreach funnel row",
    fields: "stage · owner · score · last_touch · niche · source",
  },
  {
    name: "creators",
    role: "CRM + roster source of truth",
    fields: "crm_stage · standing · rate · manager · deep_link",
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
    fields: "period · amount · status · updated_at",
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
      "Map creator deep links → RevenueCat installs + unique web visits into attribution_daily.",
  },
  {
    title: "Harden onboarding webhooks",
    detail:
      "HMAC verify, idempotency keys, and stage writes so Slack bots and CRM never disagree.",
  },
  {
    title: "At-risk cadence alerts",
    detail:
      "Cron: under-posting + standing drop → Slack DM with a deep link into the creator record.",
  },
];

export default function SystemsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Platform · Systems"
        title="Pipelines behind the UI."
        description="Entities, live webhook ingress, attribution math, and the integration surface Relay reads and writes."
        action={
          <Link href="/crm">
            <Button tone="ink">Open CRM</Button>
          </Link>
        }
      />

      <div className="mb-5 animate-rise">
        <ArchitectureMap />
      </div>

      <div className="mb-5 animate-rise" style={{ animationDelay: "40ms" }}>
        <WebhookConsole />
      </div>

      <section className="panel animate-rise mb-5 rounded-2xl p-5" style={{ animationDelay: "60ms" }}>
        <SectionTitle title="Core entities" />
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
        <section className="panel animate-rise rounded-2xl p-5">
          <SectionTitle title="Attribution sketch" />
          <pre className="mono overflow-x-auto rounded-xl border border-line bg-ink px-4 py-3 text-[11px] leading-relaxed text-white/90">
{`for each creator, day d:
  views      = sum(content_events.views)
  installs   = RevenueCat events w/ creator deep link
  web_visits = unique web sessions w/ same link
  revenue    = installs * ARPU
             + web_visits * web_conversion_value

CPM_eff = revenue / (views / 1000)
flag if posts_done/posts_due < 0.5`}
          </pre>
        </section>

        <section className="panel animate-rise rounded-2xl p-5">
          <SectionTitle title="Next ships" />
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
      </div>
    </div>
  );
}
