"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { activity, competitorPulse, dailyMetrics } from "@/data/seed";
import { useOps } from "@/lib/ops-store";
import { useLive } from "@/lib/live-store";
import { formatCompact, formatUsd, pct } from "@/lib/utils";
import {
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
import { ConversionRibbon } from "@/components/charts/ConversionRibbon";
import { LiveTicker } from "@/components/live/LiveTicker";
import { AnimatePresence, motion } from "framer-motion";

export default function PulsePage() {
  const { creators } = useOps();
  const { events, pulse } = useLive();
  const [range, setRange] = useState<7 | 30>(30);

  const slice = dailyMetrics.slice(-range);
  const prev = dailyMetrics.slice(-(range * 2), -range);

  const views = slice.reduce((s, d) => s + d.views, 0);
  const installs = slice.reduce((s, d) => s + d.installs, 0);
  const web = slice.reduce((s, d) => s + d.webVisits, 0);
  const rev = slice.reduce((s, d) => s + d.revenue, 0);

  // subtle live bump so counters feel alive during Loom
  const liveBump = 1 + Math.min(pulse, 20) * 0.0004;
  const viewsLive = Math.round(views * liveBump);
  const installsLive = Math.round(installs * liveBump);
  const webLive = Math.round(web * liveBump);
  const revLive = Math.round(rev * liveBump);

  const prevViews = prev.reduce((s, d) => s + d.views, 0) || 1;
  const prevInstalls = prev.reduce((s, d) => s + d.installs, 0) || 1;
  const prevWeb = prev.reduce((s, d) => s + d.webVisits, 0) || 1;
  const prevRev = prev.reduce((s, d) => s + d.revenue, 0) || 1;

  const live = creators.filter((c) => c.stage === "live");
  const top = [...live].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 5);
  const atRisk = creators.filter(
    (c) => c.standing === "at_risk" || c.standing === "watch",
  );

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
      <div className="panel grain hero-scan mb-5 overflow-hidden rounded-2xl p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Pulse · last sync {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            <h1 className="display mt-2 text-[2.75rem] leading-[0.92] text-ink md:text-6xl">
              Creator ops.
              <span className="block text-signal-deep">Tied to outcomes.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              Recruit, onboard, manage, and pay — with every view attributed to
              app installs, unique web visits, and revenue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Link href="/systems">
              <Button tone="ink">See systems</Button>
            </Link>
          </div>
        </div>
      </div>

      <LiveTicker />
      <ConversionRibbon
        rates={conv}
        steps={[
          {
            key: "views",
            label: "Views",
            value: formatCompact(viewsLive),
            color: "#12c48b",
          },
          {
            key: "installs",
            label: "Installs",
            value: formatCompact(installsLive),
            color: "#ff4f24",
          },
          {
            key: "web",
            label: "Web visits",
            value: formatCompact(webLive),
            color: "#0b1220",
          },
          {
            key: "rev",
            label: "Revenue",
            value: formatUsd(revLive),
            color: "#efb014",
          },
        ]}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Creator views"
          numericValue={viewsLive}
          delta={pct(((views - prevViews) / prevViews) * 100)}
          hint={`vs prior ${range}d`}
          spark={slice.map((d) => d.views)}
          delay={40}
        />
        <StatBlock
          label="App installs"
          numericValue={installsLive}
          delta={pct(((installs - prevInstalls) / prevInstalls) * 100)}
          hint="attributed"
          spark={slice.map((d) => d.installs)}
          delay={90}
        />
        <StatBlock
          label="Unique web visits"
          numericValue={webLive}
          delta={pct(((web - prevWeb) / prevWeb) * 100)}
          hint="web pivot"
          spark={slice.map((d) => d.webVisits)}
          delay={140}
        />
        <StatBlock
          label="Attributed revenue"
          numericValue={revLive}
          valueFormat="usd"
          delta={pct(((rev - prevRev) / prevRev) * 100)}
          hint="window"
          spark={slice.map((d) => d.revenue)}
          delay={190}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section
          className="panel animate-rise rounded-2xl p-4 md:p-5"
          style={{ animationDelay: "220ms" }}
        >
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

        <section
          className="panel animate-rise rounded-2xl p-4 md:p-5"
          style={{ animationDelay: "260ms" }}
        >
          <SectionTitle title="Live signal stream" />
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {events.slice(0, 6).map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white/60 px-3 py-2.5"
                >
                  <div>
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
                    <p className="mt-1 text-sm font-medium text-ink">{item.title}</p>
                  </div>
                  <span className="mono shrink-0 text-[10px] text-muted">
                    {new Date(item.at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="panel rounded-2xl p-4 md:p-5">
          <SectionTitle title="Revenue pulse" />
          <RevenueChart data={slice} />
        </section>
        <section className="panel rounded-2xl p-4 md:p-5">
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
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel rounded-2xl p-4 md:p-5">
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

        <section className="panel rounded-2xl p-4 md:p-5">
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
          <div className="mt-4 border-t border-line pt-3">
            <p className="mono mb-2 text-[10px] uppercase tracking-[0.14em] text-muted">
              Ops diary
            </p>
            {activity.slice(0, 2).map((item) => (
              <p key={item.id} className="mb-1 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{item.title}. </span>
                {item.detail}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
