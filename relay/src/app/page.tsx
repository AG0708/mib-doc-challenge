"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { activity, competitorPulse, dailyMetrics } from "@/data/seed";
import { useOps } from "@/lib/ops-store";
import { formatCompact, formatUsd, pct } from "@/lib/utils";
import {
  PageHeader,
  SectionTitle,
  StatBlock,
  Badge,
  Avatar,
  Button,
} from "@/components/ui/primitives";
import {
  FunnelChart,
  RevenueChart,
  CompetitorBars,
} from "@/components/charts/Charts";

export default function PulsePage() {
  const { creators } = useOps();
  const [range, setRange] = useState<7 | 30>(30);

  const slice = dailyMetrics.slice(-range);
  const prev = dailyMetrics.slice(-(range * 2), -range);

  const views = slice.reduce((s, d) => s + d.views, 0);
  const installs = slice.reduce((s, d) => s + d.installs, 0);
  const web = slice.reduce((s, d) => s + d.webVisits, 0);
  const rev = slice.reduce((s, d) => s + d.revenue, 0);

  const prevViews = prev.reduce((s, d) => s + d.views, 0) || 1;
  const prevInstalls = prev.reduce((s, d) => s + d.installs, 0) || 1;
  const prevWeb = prev.reduce((s, d) => s + d.webVisits, 0) || 1;
  const prevRev = prev.reduce((s, d) => s + d.revenue, 0) || 1;

  const live = creators.filter((c) => c.stage === "live");
  const top = [...live].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 5);
  const atRisk = creators.filter((c) => c.standing === "at_risk" || c.standing === "watch");

  const conv = useMemo(
    () => ({
      viewToInstall: (installs / views) * 100,
      viewToWeb: (web / views) * 100,
      revPerInstall: rev / installs,
    }),
    [installs, views, web, rev],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Command · Pulse"
        title="One loop for creator ops."
        description="Recruit → onboard → manage → pay, with views attributed to installs, unique web visits, and revenue."
        action={
          <div className="flex items-center gap-2">
            <div className="panel-strong flex rounded-xl p-1">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRange(n as 7 | 30)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    range === n ? "bg-ink text-white" : "text-muted"
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="panel rounded-xl px-3 py-2.5 text-sm">
          <span className="text-muted">View → install </span>
          <span className="mono font-semibold">{conv.viewToInstall.toFixed(2)}%</span>
        </div>
        <div className="panel rounded-xl px-3 py-2.5 text-sm">
          <span className="text-muted">View → web </span>
          <span className="mono font-semibold">{conv.viewToWeb.toFixed(2)}%</span>
        </div>
        <div className="panel rounded-xl px-3 py-2.5 text-sm">
          <span className="text-muted">Rev / install </span>
          <span className="mono font-semibold">{formatUsd(conv.revPerInstall)}</span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Creator views"
          value={formatCompact(views)}
          delta={pct(((views - prevViews) / prevViews) * 100)}
          hint={`vs prior ${range}d`}
          spark={slice.map((d) => d.views)}
          delay={40}
        />
        <StatBlock
          label="App installs"
          value={formatCompact(installs)}
          delta={pct(((installs - prevInstalls) / prevInstalls) * 100)}
          hint="attributed"
          spark={slice.map((d) => d.installs)}
          delay={90}
        />
        <StatBlock
          label="Unique web visits"
          value={formatCompact(web)}
          delta={pct(((web - prevWeb) / prevWeb) * 100)}
          hint="web pivot"
          spark={slice.map((d) => d.webVisits)}
          delay={140}
        />
        <StatBlock
          label="Attributed revenue"
          value={formatUsd(rev)}
          delta={pct(((rev - prevRev) / prevRev) * 100)}
          hint="window"
          spark={slice.map((d) => d.revenue)}
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
          <FunnelChart data={slice} />
        </section>

        <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "280ms" }}>
          <SectionTitle title="Revenue pulse" />
          <RevenueChart data={slice} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
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
            <SectionTitle
              title="Needs attention"
              aside={
                <Link href="/roster">
                  <Button size="sm">Open roster</Button>
                </Link>
              }
            />
            <div className="space-y-2">
              {atRisk.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted">
                        {c.postsDone}/{c.postsDue} posts · {c.manager}
                      </p>
                    </div>
                  </div>
                  <Badge tone={c.standing === "at_risk" ? "heat" : "amber"}>
                    {c.standing.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "400ms" }}>
            <SectionTitle title="Top creators" />
            <div className="space-y-2">
              {top.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/55 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mono w-5 text-xs text-muted">0{i + 1}</span>
                    <Avatar name={c.name} size="sm" />
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

          <section className="panel animate-rise rounded-2xl p-4 md:p-5" style={{ animationDelay: "440ms" }}>
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
