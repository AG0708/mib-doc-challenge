"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAlerts, useMetrics } from "@/lib/api";
import { formatCompact, formatUsd, pct } from "@/lib/utils";
import {
  PageHeader,
  Stat,
  Badge,
  Avatar,
  Button,
  Empty,
  StatSkeleton,
} from "@/components/ui/primitives";

export default function PulsePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, mutate } = useMetrics(days);
  const { data: alertsData } = useAlerts();
  const payload = data?.data;
  const alerts = alertsData?.data ?? [];

  if (error) {
    return <Empty label="Failed to load metrics from DB. Is the API up?" />;
  }

  const totals = payload?.totals;
  const metrics = payload?.metrics ?? [];
  const conv = payload?.conversion;

  return (
    <div className="animate-rise">
      <PageHeader
        title="Pulse"
        description="Attributed creator performance — views, installs, web visits, and revenue from the live database."
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    days === n ? "bg-ink text-white" : "text-muted"
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
            <Button onClick={() => mutate()}>Refresh</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && !payload ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat
              label="Views"
              value={formatCompact(totals?.views ?? 0)}
              hint={`${days}d window`}
            />
            <Stat
              label="App installs"
              value={formatCompact(totals?.installs ?? 0)}
              hint={
                conv ? `${conv.viewToInstall.toFixed(2)}% of views` : undefined
              }
            />
            <Stat
              label="Web visits"
              value={formatCompact(totals?.webVisits ?? 0)}
              hint={
                conv ? `${conv.viewToWeb.toFixed(2)}% of views` : undefined
              }
            />
            <Stat
              label="Revenue"
              value={formatUsd(totals?.revenue ?? 0)}
              hint={
                conv ? `${formatUsd(conv.revPerInstall)} / install` : undefined
              }
            />
          </>
        )}
      </div>

      {alerts.length > 0 && (
        <section className="card mb-4 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ops alerts</h2>
            <span className="mono text-xs text-muted">{alerts.length}</span>
          </div>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="block rounded-lg border border-line bg-bg px-3 py-2.5 transition hover:border-ink/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        a.severity === "high"
                          ? "heat"
                          : a.severity === "med"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {a.severity}
                    </Badge>
                    <p className="truncate text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{a.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Views → installs</h2>
            <div className="flex gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-signal" /> Views
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-heat" /> Installs
              </span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="l"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip />
                <Area
                  yAxisId="l"
                  type="monotone"
                  dataKey="views"
                  stroke="#059669"
                  fill="#ecfdf5"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="r"
                  type="monotone"
                  dataKey="installs"
                  stroke="#dc2626"
                  fill="#fef2f2"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Revenue</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${formatCompact(Number(v))}`}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
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

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-4 xl:col-span-1">
          <h2 className="mb-3 text-sm font-semibold">Share of voice</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={payload?.competitors ?? []}
                layout="vertical"
                margin={{ left: 8, right: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="shareOfVoice" radius={[0, 6, 6, 0]}>
                  {(payload?.competitors ?? []).map((c) => (
                    <Cell
                      key={c.name}
                      fill={c.name === "Sherlock" ? "#059669" : "#111827"}
                      fillOpacity={c.name === "Sherlock" ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            {(payload?.competitors ?? []).map((c) => (
              <li key={c.name} className="flex justify-between gap-2 text-sm">
                <span className="text-muted">{c.topHook}</span>
                <span
                  className={`mono font-medium ${
                    c.weekDelta >= 0 ? "text-signal" : "text-heat"
                  }`}
                >
                  {pct(c.weekDelta)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Needs attention</h2>
            <Link href="/roster" className="text-xs font-medium text-signal">
              Roster →
            </Link>
          </div>
          <div className="space-y-2">
            {(payload?.atRisk ?? []).slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
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

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Top creators</h2>
          <div className="space-y-2">
            {(payload?.topCreators ?? []).slice(0, 5).map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="mono w-4 text-xs text-muted">{i + 1}</span>
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.handle}</p>
                  </div>
                </div>
                <p className="mono text-sm font-semibold">
                  {formatUsd(c.revenue30d)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
