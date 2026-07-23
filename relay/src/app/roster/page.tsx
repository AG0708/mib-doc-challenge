"use client";

import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import { useCreators } from "@/lib/api";
import { api, cn, formatCompact, formatUsd } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Select,
  Avatar,
  Stat,
  Empty,
} from "@/components/ui/primitives";

const STANDING_TONE = {
  elite: "signal" as const,
  strong: "ink" as const,
  watch: "amber" as const,
  at_risk: "heat" as const,
};

export default function RosterPage() {
  const { push } = useToast();
  const [standing, setStanding] = useState("all");
  const [sort, setSort] = useState("revenue");
  const { data, isLoading, mutate } = useCreators(
    standing === "all" ? "" : `?standing=${standing}`,
  );

  const list = useMemo(() => {
    let rows = (data?.data ?? []).filter((c) =>
      ["live", "paused", "first_post"].includes(c.stage),
    );
    rows = [...rows].sort((a, b) => {
      if (sort === "views") return b.views30d - a.views30d;
      if (sort === "cadence") {
        const fa = a.postsDue ? a.postsDone / a.postsDue : 1;
        const fb = b.postsDue ? b.postsDone / b.postsDue : 1;
        return fa - fb;
      }
      return b.revenue30d - a.revenue30d;
    });
    return rows;
  }, [data, sort]);

  async function setStandingFor(id: string, next: string) {
    await api("/api/creators", {
      method: "PATCH",
      body: JSON.stringify({ id, standing: next }),
    });
    await mutate();
    await globalMutate("/api/activity");
    push({ title: "Standing updated", detail: next, tone: "warn" });
  }

  const fulfillment = Math.round(
    (list.reduce(
      (s, c) => s + (c.postsDue ? c.postsDone / c.postsDue : 1),
      0,
    ) /
      Math.max(list.length, 1)) *
      100,
  );

  return (
    <div className="animate-rise">
      <PageHeader
        title="Roster"
        description="Active creators — cadence, standing, and attributed outcomes from the database."
        action={
          <div className="flex gap-2">
            <Select value={standing} onChange={(e) => setStanding(e.target.value)}>
              <option value="all">All standing</option>
              <option value="elite">Elite</option>
              <option value="strong">Strong</option>
              <option value="watch">Watch</option>
              <option value="at_risk">At risk</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="revenue">Sort · revenue</option>
              <option value="views">Sort · views</option>
              <option value="cadence">Sort · cadence risk</option>
            </Select>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Active roster" value={String(list.length)} />
        <Stat label="Avg fulfillment" value={`${fulfillment}%`} />
        <Stat
          label="Roster revenue 30d"
          value={formatUsd(list.reduce((s, c) => s + c.revenue30d, 0))}
        />
      </div>

      {isLoading && <Empty label="Loading roster…" />}

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => {
          const fill = c.postsDue ? Math.min(1, c.postsDone / c.postsDue) : 0;
          return (
            <article key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={c.name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{c.name}</h3>
                      <Badge
                        tone={
                          STANDING_TONE[
                            c.standing as keyof typeof STANDING_TONE
                          ] ?? "neutral"
                        }
                      >
                        {c.standing.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted">
                      {c.handle} · {c.manager} · {c.rate}
                    </p>
                    <p className="mono mt-0.5 text-[11px] text-muted">
                      Last post{" "}
                      {c.lastPostAt ? formatRelative(c.lastPostAt) : "—"}
                    </p>
                  </div>
                </div>
                <p className="mono text-right text-sm font-semibold">
                  {formatUsd(c.revenue30d)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-bg px-2 py-2">
                  <p className="text-[11px] text-muted">Views</p>
                  <p className="mono font-semibold">
                    {formatCompact(c.views30d)}
                  </p>
                </div>
                <div className="rounded-lg bg-bg px-2 py-2">
                  <p className="text-[11px] text-muted">Installs</p>
                  <p className="mono font-semibold">
                    {formatCompact(c.installs30d)}
                  </p>
                </div>
                <div className="rounded-lg bg-bg px-2 py-2">
                  <p className="text-[11px] text-muted">Web</p>
                  <p className="mono font-semibold">
                    {formatCompact(c.webVisits30d)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">Cadence</span>
                  <span className="mono">
                    {c.postsDone}/{c.postsDue}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      fill >= 0.85
                        ? "bg-signal"
                        : fill >= 0.5
                          ? "bg-amber"
                          : "bg-heat",
                    )}
                    style={{ width: `${fill * 100}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(["elite", "strong", "watch", "at_risk"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    tone={c.standing === s ? "ink" : "ghost"}
                    onClick={() => setStandingFor(c.id, s)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
