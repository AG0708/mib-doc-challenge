"use client";

import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCreators, useMetrics, usePayouts } from "@/lib/api";
import { api, cn, formatCompact, formatUsd } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Stat,
  Avatar,
  Empty,
} from "@/components/ui/primitives";

const STATUS_TONE = {
  paid: "signal" as const,
  processing: "amber" as const,
  queued: "neutral" as const,
  hold: "heat" as const,
};

export default function FinancialsPage() {
  const { push } = useToast();
  const [status, setStatus] = useState("all");
  const { data, isLoading, mutate } = usePayouts(
    status === "all" ? "" : `?status=${status}`,
  );
  const { data: metricsData } = useMetrics(30);
  const { data: creatorsData } = useCreators("");
  const rows = data?.data ?? [];
  const allPayouts = usePayouts("").data?.data ?? [];

  const payrollDue = allPayouts
    .filter((p) => p.status === "queued" || p.status === "processing")
    .reduce((s, p) => s + p.amount, 0);
  const paid = allPayouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const held = allPayouts
    .filter((p) => p.status === "hold")
    .reduce((s, p) => s + p.amount, 0);

  const attribution = useMemo(
    () =>
      [...(creatorsData?.data ?? [])]
        .filter((c) => c.stage === "live")
        .sort((a, b) => b.revenue30d - a.revenue30d)
        .slice(0, 6)
        .map((c) => ({
          name: c.name.split(" ")[0],
          installs: c.installs30d,
          webVisits: c.webVisits30d,
        })),
    [creatorsData],
  );

  async function setStatusFor(ids: string[], next: string) {
    await api("/api/payouts", {
      method: "PATCH",
      body: JSON.stringify({ ids, status: next }),
    });
    await mutate();
    await globalMutate("/api/payouts");
    await globalMutate("/api/activity");
    push({ title: `Payouts → ${next}`, detail: `${ids.length} row(s)`, tone: "ok" });
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Financials"
        description="Payroll ledger and attribution charts — every status change is persisted."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const header = [
                  "creator",
                  "period",
                  "views",
                  "amount",
                  "status",
                  "updated_at",
                ];
                const lines = allPayouts.map((p) =>
                  [
                    p.creatorName,
                    p.period,
                    p.views,
                    p.amount,
                    p.status,
                    p.updatedAt,
                  ]
                    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                    .join(","),
                );
                const csv = [header.join(","), ...lines].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `relay-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                push({ title: "CSV exported", tone: "ok" });
              }}
            >
              Export CSV
            </Button>
            <Button
              tone="signal"
              onClick={async () => {
                const res = await api<{ data: { created: number; period: string } }>(
                  "/api/payouts/generate",
                  { method: "POST", body: "{}" },
                );
                await mutate();
                await globalMutate("/api/payouts");
                await globalMutate("/api/activity");
                await globalMutate("/api/stats");
                push({
                  title: "Payouts generated",
                  detail: `${res.data.created} for ${res.data.period}`,
                  tone: "ok",
                });
              }}
            >
              Generate period
            </Button>
            <Button
              tone="ink"
              onClick={() =>
                setStatusFor(
                  allPayouts
                    .filter((p) => p.status === "queued")
                    .map((p) => p.id),
                  "processing",
                )
              }
            >
              Process queued batch
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue 30d"
          value={formatUsd(metricsData?.data.totals.revenue ?? 0)}
        />
        <Stat label="Payroll queued" value={formatUsd(payrollDue)} />
        <Stat label="Paid this cycle" value={formatUsd(paid)} />
        <Stat label="On hold" value={formatUsd(held)} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Creator attribution</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attribution}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCompact(Number(v))} width={40} />
                <Tooltip />
                <Bar dataKey="installs" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="webVisits" fill="#111827" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Daily revenue</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData?.data.metrics ?? []}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `$${formatCompact(Number(v))}`}
                  width={48}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {["all", "queued", "processing", "paid", "hold"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]",
              status === s ? "border-ink bg-ink text-white" : "border-line bg-white",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <Empty label="Loading payouts…" />}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-line bg-bg text-[11px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Creator</th>
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 font-medium">Views</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Updated</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.creatorName} size="sm" />
                      <span className="font-medium">{p.creatorName}</span>
                    </div>
                  </td>
                  <td className="mono px-3 py-2.5 text-muted">{p.period}</td>
                  <td className="mono px-3 py-2.5">{formatCompact(p.views)}</td>
                  <td className="mono px-3 py-2.5 font-semibold">
                    {formatUsd(p.amount)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      tone={
                        STATUS_TONE[p.status as keyof typeof STATUS_TONE] ??
                        "neutral"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="mono px-3 py-2.5 text-muted">
                    {formatRelative(p.updatedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.status !== "paid" && (
                        <Button
                          size="sm"
                          tone="signal"
                          onClick={() => setStatusFor([p.id], "paid")}
                        >
                          Paid
                        </Button>
                      )}
                      {p.status !== "hold" && p.status !== "paid" && (
                        <Button
                          size="sm"
                          tone="heat"
                          onClick={() => setStatusFor([p.id], "hold")}
                        >
                          Hold
                        </Button>
                      )}
                      {p.status === "hold" && (
                        <Button
                          size="sm"
                          onClick={() => setStatusFor([p.id], "queued")}
                        >
                          Release
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
