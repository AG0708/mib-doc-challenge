"use client";

import { useMemo, useState } from "react";
import { CRM_STAGES, TEAM } from "@/data/seed";
import type { CrmStage } from "@/data/types";
import { useOps } from "@/lib/ops-store";
import { cn, formatCompact, formatUsd } from "@/lib/utils";
import {
  PageHeader,
  Badge,
  Avatar,
  Button,
  Field,
  Select,
  PlatformDot,
} from "@/components/ui/primitives";

const STAGE_TONE: Record<CrmStage, "neutral" | "signal" | "heat" | "amber" | "ink"> = {
  signed: "neutral",
  onboarding: "amber",
  first_post: "signal",
  live: "ink",
  paused: "heat",
  churned: "heat",
};

export default function CrmPage() {
  const { creators, setCreatorStage, nudgeCreator } = useOps();
  const [q, setQ] = useState("");
  const [manager, setManager] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeId, setActiveId] = useState(creators[0]?.id);
  const [log, setLog] = useState<string[]>([
    "Webhook: payment_connected verified",
    "Manager assigned content guidelines",
  ]);

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.handle.toLowerCase().includes(q.toLowerCase());
      const matchM = manager === "all" || c.manager === manager;
      const matchS = stageFilter === "all" || c.stage === stageFilter;
      return matchQ && matchM && matchS;
    });
  }, [creators, q, manager, stageFilter]);

  const active = creators.find((c) => c.id === activeId) ?? filtered[0];

  const funnel = CRM_STAGES.map((s) => ({
    ...s,
    count: creators.filter((c) => c.stage === s.id).length,
  }));

  function advance(id: string, stage: CrmStage) {
    setCreatorStage(id, stage);
    setLog((prev) => [
      `Stage → ${stage.replace("_", " ")} · ${new Date().toLocaleTimeString()}`,
      ...prev,
    ].slice(0, 6));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline · CRM"
        title="Onboarding without drift."
        description="Signed to live with live webhook state — managers and Slack bots never disagree."
      />

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {funnel.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() =>
              setStageFilter((cur) => (cur === s.id ? "all" : s.id))
            }
            className={cn(
              "panel animate-rise rounded-xl px-3 py-3 text-left transition",
              stageFilter === s.id && "ring-2 ring-ink",
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {s.label}
            </p>
            <p className="mono mt-1 text-2xl font-semibold tracking-tight">
              {s.count}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Field
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators…"
          className="sm:max-w-xs"
        />
        <Select value={manager} onChange={(e) => setManager(e.target.value)}>
          <option value="all">All managers</option>
          {TEAM.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {stageFilter !== "all" && (
          <Button onClick={() => setStageFilter("all")}>Clear stage</Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
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
                      active?.id === c.id && "bg-white/85",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-muted">{c.handle}</p>
                        </div>
                      </div>
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
            <div className="flex items-start gap-3">
              <Avatar name={active.name} size="lg" />
              <div>
                <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  Creator record
                </p>
                <h3 className="display text-3xl leading-none">{active.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {active.handle} · {active.city} ·{" "}
                  <PlatformDot platform={active.platform} />
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Standing</dt>
                <dd className="mt-1 font-semibold capitalize">
                  {active.standing.replace("_", " ")}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Rate</dt>
                <dd className="mt-1 font-semibold">{active.rate}</dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Revenue 30d</dt>
                <dd className="mono mt-1 font-semibold">
                  {formatUsd(active.revenue30d)}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/60 p-3">
                <dt className="text-muted">Posts</dt>
                <dd className="mono mt-1 font-semibold">
                  {active.postsDone}/{active.postsDue}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button tone="signal" onClick={() => nudgeCreator(active.id)}>
                Slack nudge
              </Button>
              <Button
                onClick={() => advance(active.id, "first_post")}
                disabled={active.stage === "first_post"}
              >
                Mark first post
              </Button>
              <Button
                tone="ink"
                onClick={() => advance(active.id, "live")}
                disabled={active.stage === "live"}
              >
                Go live
              </Button>
            </div>

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
              <p className="mono mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-deep">
                Webhook inbox
              </p>
              HMAC-verified onboarding steps land here. Full contract on Systems.
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Activity log
            </p>
            <ul className="mt-2 space-y-1.5">
              {log.map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className="rounded-lg border border-line bg-white/55 px-2.5 py-1.5 text-xs text-ink-soft"
                >
                  {line}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
