"use client";

import { useMemo, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { formatCompact, formatUsd, cn } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import type { Creator } from "@/data/types";
import {
  PageHeader,
  Badge,
  SectionTitle,
  Avatar,
  Button,
  Select,
  PlatformDot,
} from "@/components/ui/primitives";

const STANDING_TONE = {
  elite: "signal" as const,
  strong: "ink" as const,
  watch: "amber" as const,
  at_risk: "heat" as const,
};

export default function RosterPage() {
  const { creators, nudgeCreator, setCreatorStanding } = useOps();
  const [standing, setStanding] = useState("all");
  const [sort, setSort] = useState<"revenue" | "views" | "cpm" | "cadence">("revenue");
  const [selected, setSelected] = useState<Creator | null>(null);

  const liveish = useMemo(() => {
    let list = creators.filter((c) =>
      ["live", "paused", "first_post"].includes(c.stage),
    );
    if (standing !== "all") list = list.filter((c) => c.standing === standing);
    list = [...list].sort((a, b) => {
      if (sort === "revenue") return b.revenue30d - a.revenue30d;
      if (sort === "views") return b.views30d - a.views30d;
      if (sort === "cadence") {
        const fa = a.postsDue ? a.postsDone / a.postsDue : 1;
        const fb = b.postsDue ? b.postsDone / b.postsDue : 1;
        return fa - fb;
      }
      return b.cpm - a.cpm;
    });
    return list;
  }, [creators, standing, sort]);

  const avgFulfillment = Math.round(
    (liveish.reduce(
      (s, c) => s + (c.postsDue ? c.postsDone / c.postsDue : 1),
      0,
    ) /
      Math.max(liveish.length, 1)) *
      100,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Active · Roster"
        title="Who is posting — and earning."
        description="Cadence, terms, standing, and outcomes for every live creator."
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={standing} onChange={(e) => setStanding(e.target.value)}>
              <option value="all">All standing</option>
              <option value="elite">Elite</option>
              <option value="strong">Strong</option>
              <option value="watch">Watch</option>
              <option value="at_risk">At risk</option>
            </Select>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="revenue">Sort · revenue</option>
              <option value="views">Sort · views</option>
              <option value="cpm">Sort · CPM</option>
              <option value="cadence">Sort · cadence risk</option>
            </Select>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="panel rounded-2xl p-4">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Active roster
          </p>
          <p className="mono mt-2 text-3xl font-semibold tracking-tight">
            {liveish.length}
          </p>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Avg fulfillment
          </p>
          <p className="mono mt-2 text-3xl font-semibold tracking-tight">
            {avgFulfillment}%
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
              className="panel animate-rise cursor-pointer rounded-2xl p-4 transition hover:bg-white/75 md:p-5"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => setSelected(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={c.name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{c.name}</h3>
                      <Badge tone={STANDING_TONE[c.standing]}>
                        {c.standing.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {c.handle} · {c.manager} · {c.rate}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      <PlatformDot platform={c.platform} /> · {c.city}
                    </p>
                  </div>
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

              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" tone="amber" onClick={() => nudgeCreator(c.id)}>
                  Nudge manager
                </Button>
                <Button size="sm" onClick={() => setSelected(c)}>
                  Details
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="panel-strong w-full max-w-lg rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Avatar name={selected.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="display text-3xl">{selected.name}</h3>
                <p className="text-sm text-muted">
                  {selected.handle} · next payout {formatUsd(selected.nextPayout)}
                </p>
                <p className="mono mt-1 text-[11px] text-muted">
                  Last post{" "}
                  {selected.lastPostAt
                    ? formatRelative(selected.lastPostAt)
                    : "—"}{" "}
                  · {selected.timezone}
                </p>
                <a
                  href={selected.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block truncate text-xs text-signal-deep"
                >
                  {selected.deepLink}
                </a>
              </div>
              <Button size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Set standing
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["elite", "strong", "watch", "at_risk"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCreatorStanding(selected.id, s);
                    setSelected({ ...selected, standing: s });
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
                    selected.standing === s
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white",
                  )}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button tone="amber" onClick={() => nudgeCreator(selected.id)}>
                Slack nudge
              </Button>
              <Button tone="ink" onClick={() => setSelected(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
