"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { CRM_STAGES, TEAM } from "@/data/seed";
import { useCreators } from "@/lib/api";
import { api, cn, formatCompact, formatUsd } from "@/lib/utils";
import { formatRelative, dateOnly } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  Select,
  Avatar,
  Empty,
} from "@/components/ui/primitives";

const STAGE_TONE: Record<string, "neutral" | "signal" | "heat" | "amber" | "ink"> = {
  signed: "neutral",
  onboarding: "amber",
  first_post: "signal",
  live: "ink",
  paused: "heat",
  churned: "heat",
};

export default function CrmPage() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [manager, setManager] = useState("all");
  const [stage, setStage] = useState("all");
  const query = `?q=${encodeURIComponent(q)}&manager=${manager}&stage=${stage}`;
  const { data, isLoading, mutate } = useCreators(query);
  const rows = data?.data ?? [];
  const { data: allData } = useCreators("");
  const all = allData?.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = rows.find((c) => c.id === activeId) ?? rows[0] ?? null;

  const funnel = CRM_STAGES.map((s) => ({
    ...s,
    count: all.filter((c) => c.stage === s.id).length,
  }));

  async function patch(id: string, body: Record<string, unknown>) {
    await api("/api/creators", {
      method: "PATCH",
      body: JSON.stringify({ id, ...body }),
    });
    await mutate();
    await globalMutate("/api/creators");
    await globalMutate("/api/activity");
    await globalMutate((k) => typeof k === "string" && k.startsWith("/api/metrics"));
  }

  async function advance(id: string, next: string) {
    await patch(id, { stage: next });
    setActiveId(id);
    push({ title: "CRM updated", detail: next.replaceAll("_", " "), tone: "ok" });
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="CRM"
        description="Onboarding pipeline backed by the creators table. Stage changes persist and fan out to activity."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {funnel.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStage((cur) => (cur === s.id ? "all" : s.id))}
            className={cn(
              "card px-3 py-3 text-left",
              stage === s.id && "ring-2 ring-ink",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {s.label}
            </p>
            <p className="mono mt-1 text-2xl font-semibold">{s.count}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Field
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators…"
          className="max-w-xs"
        />
        <Select value={manager} onChange={(e) => setManager(e.target.value)}>
          <option value="all">All managers</option>
          {TEAM.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <Empty label="Loading creators from DB…" />}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line bg-bg text-[11px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Creator</th>
                  <th className="px-3 py-2.5 font-medium">Stage</th>
                  <th className="px-3 py-2.5 font-medium">Manager</th>
                  <th className="px-3 py-2.5 font-medium">Views</th>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "cursor-pointer border-b border-line hover:bg-bg",
                      active?.id === c.id && "bg-signal-soft/50",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} size="sm" />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted">{c.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STAGE_TONE[c.stage] ?? "neutral"}>
                        {CRM_STAGES.find((s) => s.id === c.stage)?.label ??
                          c.stage}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{c.manager}</td>
                    <td className="mono px-3 py-2.5">
                      {formatCompact(c.views30d)}
                    </td>
                    <td className="mono px-3 py-2.5 text-muted">
                      {dateOnly(c.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {active && (
          <aside className="card p-4">
            <div className="flex items-start gap-3">
              <Avatar name={active.name} />
              <div>
                <h3 className="text-xl font-semibold">{active.name}</h3>
                <p className="text-sm text-muted">
                  {active.handle} · {active.city} · {active.platform}
                </p>
                <p className="mono mt-1 text-[11px] text-muted">
                  {active.email}
                </p>
              </div>
            </div>
            <a
              href={active.deepLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block truncate rounded-lg border border-line bg-bg px-3 py-2 text-xs text-signal"
            >
              {active.deepLink}
            </a>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-line bg-bg p-2.5">
                <dt className="text-xs text-muted">Standing</dt>
                <dd className="mt-0.5 font-semibold capitalize">
                  {active.standing.replace("_", " ")}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-bg p-2.5">
                <dt className="text-xs text-muted">Revenue 30d</dt>
                <dd className="mono mt-0.5 font-semibold">
                  {formatUsd(active.revenue30d)}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-bg p-2.5">
                <dt className="text-xs text-muted">Last post</dt>
                <dd className="mono mt-0.5 font-semibold">
                  {active.lastPostAt
                    ? formatRelative(active.lastPostAt)
                    : "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-bg p-2.5">
                <dt className="text-xs text-muted">Rate</dt>
                <dd className="mt-0.5 font-semibold">{active.rate}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="signal" onClick={() => advance(active.id, "first_post")}>
                Mark first post
              </Button>
              <Button tone="ink" onClick={() => advance(active.id, "live")}>
                Go live
              </Button>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Move stage
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CRM_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => advance(active.id, s.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]",
                    active.stage === s.id
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
