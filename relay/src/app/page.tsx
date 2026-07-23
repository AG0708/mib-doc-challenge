import { creators, dailyMetrics, activity, competitorPulse } from "@/data/seed";
import { formatCompact, formatUsd, pct } from "@/lib/utils";
import { PageHeader, SectionTitle, StatBlock, Badge } from "@/components/ui/primitives";
import {
  FunnelChart,
  RevenueChart,
  CompetitorBars,
} from "@/components/charts/Charts";

export default function PulsePage() {
  const live = creators.filter((c) => c.stage === "live");
  const views30 = dailyMetrics.reduce((s, d) => s + d.views, 0);
  const installs30 = dailyMetrics.reduce((s, d) => s + d.installs, 0);
  const web30 = dailyMetrics.reduce((s, d) => s + d.webVisits, 0);
  const rev30 = dailyMetrics.reduce((s, d) => s + d.revenue, 0);
  const last7 = dailyMetrics.slice(-7);
  const prev7 = dailyMetrics.slice(-14, -7);
  const revDelta =
    ((last7.reduce((s, d) => s + d.revenue, 0) -
      prev7.reduce((s, d) => s + d.revenue, 0)) /
      prev7.reduce((s, d) => s + d.revenue, 0)) *
    100;

  const top = [...live].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Command · Pulse"
        title="Outcomes, not vanity."
        description="Live read on how creator content turns into app installs, unique web visits, and revenue — the loop Relay exists to close."
        action={
          <div className="panel-strong flex items-center gap-3 rounded-xl px-4 py-3">
            <span className="live-dot h-2 w-2 rounded-full bg-signal" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Window
              </p>
              <p className="mono text-sm font-medium">Last 30 days</p>
            </div>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Creator views"
          value={formatCompact(views30)}
          delta="+12.4%"
          hint="vs prior 30d"
          delay={40}
        />
        <StatBlock
          label="App installs"
          value={formatCompact(installs30)}
          delta="+9.1%"
          hint="attributed"
          delay={90}
        />
        <StatBlock
          label="Unique web visits"
          value={formatCompact(web30)}
          delta="+18.6%"
          hint="web pivot"
          delay={140}
        />
        <StatBlock
          label="Attributed revenue"
          value={formatUsd(rev30)}
          delta={pct(revDelta)}
          hint="WoW"
          delay={190}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "220ms" }}>
          <SectionTitle
            title="Views → installs"
            aside={
              <div className="flex gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-signal" /> Views
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-heat" /> Installs
                </span>
              </div>
            }
          />
          <FunnelChart data={dailyMetrics} />
        </section>

        <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "280ms" }}>
          <SectionTitle title="Revenue pulse" />
          <RevenueChart data={dailyMetrics} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "320ms" }}>
          <SectionTitle title="Share of voice" />
          <CompetitorBars rows={competitorPulse} />
          <ul className="mt-2 space-y-2">
            {competitorPulse.map((c) => (
              <li
                key={c.name}
                className="flex items-start justify-between gap-3 border-t border-line pt-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-muted">{c.topHook}</p>
                </div>
                <span
                  className={`mono shrink-0 font-medium ${
                    c.weekDelta >= 0 ? "text-signal-deep" : "text-heat"
                  }`}
                >
                  {pct(c.weekDelta)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-4">
          <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "360ms" }}>
            <SectionTitle title="Top creators by revenue" />
            <div className="space-y-2">
              {top.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/55 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mono text-xs text-muted">0{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-sm text-muted">{c.handle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mono font-semibold">{formatUsd(c.revenue30d)}</p>
                    <p className="mono text-xs text-muted">
                      {formatCompact(c.views30d)} views
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "400ms" }}>
            <SectionTitle title="Ops feed" />
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      tone={
                        item.kind === "alert"
                          ? "heat"
                          : item.kind === "finance"
                            ? "amber"
                            : item.kind === "content"
                              ? "signal"
                              : "neutral"
                      }
                    >
                      {item.kind}
                    </Badge>
                    <span className="mono text-[11px] text-muted">
                      {new Date(item.at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-sm text-muted">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
