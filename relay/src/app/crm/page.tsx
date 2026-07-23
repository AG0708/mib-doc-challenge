"use client";

import { useMemo, useState } from "react";
import { creators as seedCreators, CRM_STAGES, TEAM } from "@/data/seed";
import type { Creator, CrmStage } from "@/data/types";
import { cn, formatCompact } from "@/lib/utils";
import { PageHeader, Badge } from "@/components/ui/primitives";

const STAGE_TONE: Record<CrmStage, "neutral" | "signal" | "heat" | "amber" | "ink"> = {
  signed: "neutral",
  onboarding: "amber",
  first_post: "signal",
  live: "ink",
  paused: "heat",
  churned: "heat",
};

export default function CrmPage() {
  const [rows, setRows] = useState<Creator[]>(seedCreators);
  const [q, setQ] = useState("");
  const [manager, setManager] = useState("all");
  const [activeId, setActiveId] = useState(seedCreators[0]?.id);

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.handle.toLowerCase().includes(q.toLowerCase());
      const matchM = manager === "all" || c.manager === manager;
      return matchQ && matchM;
    });
  }, [rows, q, manager]);

  const active = rows.find((c) => c.id === activeId) ?? filtered[0];

  const funnel = CRM_STAGES.map((s) => ({
    ...s,
    count: rows.filter((c) => c.stage === s.id).length,
  }));

  function advance(id: string, stage: CrmStage) {
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline · CRM"
        title="Onboarding without drift."
        description="Every creator from signed to live — status, next step, and manager ownership in one place so nothing stalls between systems."
      />

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {funnel.map((s, i) => (
          <div
            key={s.id}
            className="panel animate-rise rounded-xl px-3 py-3"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {s.label}
            </p>
            <p className="mono mt-1 text-2xl font-semibold tracking-tight">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators…"
          className="panel-strong w-full rounded-xl px-4 py-2.5 text-sm outline-none ring-signal/30 focus:ring-2 sm:max-w-xs"
        />
        <select
          value={manager}
          onChange={(e) => setManager(e.target.value)}
          className="panel-strong rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="all">All managers</option>
          {TEAM.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-white/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">30d views</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "cursor-pointer border-b border-line/70 transition hover:bg-white/60",
                      active?.id === c.id && "bg-white/80",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-muted">{c.handle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STAGE_TONE[c.stage]}>
                        {CRM_STAGES.find((s) => s.id === c.stage)?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.manager}</td>
                    <td className="mono px-4 py-3">{formatCompact(c.views30d)}</td>
                    <td className="mono px-4 py-3 text-muted">{c.joinedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {active && (
          <aside className="panel animate-rise rounded-2xl p-5">
            <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Creator record
            </p>
            <h3 className="display mt-1 text-3xl">{active.name}</h3>
            <p className="mt-1 text-muted">
              {active.handle} · {active.city} · {active.platform}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Standing</dt>
                <dd className="mt-1 font-semibold capitalize">{active.standing.replace("_", " ")}</dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Rate</dt>
                <dd className="mt-1 font-semibold">{active.rate}</dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Posts</dt>
                <dd className="mono mt-1 font-semibold">
                  {active.postsDone}/{active.postsDue}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Last post</dt>
                <dd className="mono mt-1 font-semibold">{active.lastPostAt}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Move stage
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CRM_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => advance(active.id, s.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
                    active.stage === s.id
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white/70 hover:bg-white",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-signal/40 bg-signal/5 p-3 text-sm text-ink-soft">
              Web onboarding webhooks land here. HMAC-verified step updates keep
              this record live across signup → payment → first post.
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
