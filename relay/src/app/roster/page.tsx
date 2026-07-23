"use client";

import { useMemo, useState } from "react";
import { creators } from "@/data/seed";
import { formatCompact, formatUsd, cn } from "@/lib/utils";
import { PageHeader, Badge, SectionTitle } from "@/components/ui/primitives";

const STANDING_TONE = {
  elite: "signal" as const,
  strong: "ink" as const,
  watch: "amber" as const,
  at_risk: "heat" as const,
};

export default function RosterPage() {
  const [standing, setStanding] = useState<string>("all");
  const [sort, setSort] = useState<"revenue" | "views" | "cpm">("revenue");

  const liveish = useMemo(() => {
    let list = creators.filter((c) =>
      ["live", "paused", "first_post"].includes(c.stage),
    );
    if (standing !== "all") list = list.filter((c) => c.standing === standing);
    list = [...list].sort((a, b) => {
      if (sort === "revenue") return b.revenue30d - a.revenue30d;
      if (sort === "views") return b.views30d - a.views30d;
      return b.cpm - a.cpm;
    });
    return list;
  }, [standing, sort]);

  return (
    <div>
      <PageHeader
        eyebrow="Active · Roster"
        title="Who is posting — and earning."
        description="Management view for the live roster: content cadence, commercial terms, standing, and the outcomes each creator is driving."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={standing}
              onChange={(e) => setStanding(e.target.value)}
              className="panel-strong rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All standing</option>
              <option value="elite">Elite</option>
              <option value="strong">Strong</option>
              <option value="watch">Watch</option>
              <option value="at_risk">At risk</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="panel-strong rounded-xl px-3 py-2 text-sm"
            >
              <option value="revenue">Sort · revenue</option>
              <option value="views">Sort · views</option>
              <option value="cpm">Sort · CPM</option>
            </select>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="panel rounded-2xl p-4">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Active roster
          </p>
          <p className="mono mt-2 text-3xl font-semibold tracking-tight">{liveish.length}</p>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Avg fulfillment
          </p>
          <p className="mono mt-2 text-3xl font-semibold tracking-tight">
            {Math.round(
              (liveish.reduce(
                (s, c) => s + (c.postsDue ? c.postsDone / c.postsDue : 1),
                0,
              ) /
                Math.max(liveish.length, 1)) *
                100,
            )}
            %
          </p>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Roster revenue 30d
          </p>
          <p className="mono mt-2 text-3xl font-semibold tracking-tight">
            {formatUsd(liveish.reduce((s, c) => s + c.revenue30d, 0))}
          </p>
        </div>
      </div>

      <SectionTitle title="Creators" />
      <div className="grid gap-3 md:grid-cols-2">
        {liveish.map((c, i) => {
          const fulfillment = c.postsDue
            ? Math.min(1, c.postsDone / c.postsDue)
            : 0;
          return (
            <article
              key={c.id}
              className="panel animate-rise rounded-2xl p-4 md:p-5"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <Badge tone={STANDING_TONE[c.standing]}>
                      {c.standing.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.handle} · {c.manager} · {c.rate}
                  </p>
                </div>
                <p className="mono text-right text-sm font-semibold">
                  {formatUsd(c.revenue30d)}
                  <span className="block text-[11px] font-normal text-muted">
                    revenue
                  </span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-white/60 px-2.5 py-2">
                  <p className="text-[11px] text-muted">Views</p>
                  <p className="mono font-semibold">{formatCompact(c.views30d)}</p>
                </div>
                <div className="rounded-lg bg-white/60 px-2.5 py-2">
                  <p className="text-[11px] text-muted">Installs</p>
                  <p className="mono font-semibold">
                    {formatCompact(c.installs30d)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/60 px-2.5 py-2">
                  <p className="text-[11px] text-muted">Web</p>
                  <p className="mono font-semibold">
                    {formatCompact(c.webVisits30d)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">Post cadence</span>
                  <span className="mono">
                    {c.postsDone}/{c.postsDue}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      fulfillment >= 0.85
                        ? "bg-signal"
                        : fulfillment >= 0.5
                          ? "bg-amber"
                          : "bg-heat",
                    )}
                    style={{ width: `${fulfillment * 100}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
