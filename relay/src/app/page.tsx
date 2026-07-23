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
  Panel,
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
    <div className="animate-rise space-y-3">
      <PageHeader
        title="Pulse"
        description="Attributed performance from the live database — views, installs, web visits, revenue."
        action={
          <>
            <div className="flex rounded border border-line bg-white p-0.5">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                    days === n ? "bg-ink text-white" : "text-muted"
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => mutate()}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="kpi-strip">
        {isLoading && !payload ? (
          <>
            <StatSkeleton bare />
            <StatSkeleton bare />
            <StatSkeleton bare />
            <StatSkeleton bare />
          </>
        ) : (
          <>
            <Stat
              bare
              label="Views"
              value={formatCompact(totals?.views ?? 0)}
              hint={`${days}d window`}
            />
            <Stat
              bare
              label="App installs"
              value={formatCompact(totals?.installs ?? 0)}
              hint={
                conv ? `${conv.viewToInstall.toFixed(2)}% of views` : undefined
              }
            />
            <Stat
              bare
              label="Web visits"
              value={formatCompact(totals?.webVisits ?? 0)}
              hint={
                conv ? `${conv.viewToWeb.toFixed(2)}% of views` : undefined
              }
            />
            <Stat
              bare
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
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Ops alerts</h2>
            <span className="mono text-[11px] text-muted">{alerts.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#f8fafc]"
                >
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
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {a.title}
                  </span>
                  <span className="hidden truncate text-[11px] text-muted sm:inline max-w-[40%]">
                    {a.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="Views → installs"
          action={
            <div className="flex gap-2.5 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" /> Views
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-heat" /> Installs
              </span>
            </div>
          }
        >
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e8edf2" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="l"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip />
                <Area
                  yAxisId="l"
                  type="monotone"
                  dataKey="views"
                  stroke="#0f766e"
                  fill="#ecfdf8"
                  strokeWidth={1.75}
                />
                <Area
                  yAxisId="r"
                  type="monotone"
                  dataKey="installs"
                  stroke="#b91c1c"
                  fill="#fef2f2"
                  strokeWidth={1.75}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Revenue">
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e8edf2" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${formatCompact(Number(v))}`}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0b1220"
                  strokeWidth={1.75}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Share of voice">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={payload?.competitors ?? []}
                layout="vertical"
                margin={{ left: 4, right: 8, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 10, fill: "#334155" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="shareOfVoice" radius={[0, 3, 3, 0]}>
                  {(payload?.competitors ?? []).map((c) => (
                    <Cell
                      key={c.name}
                      fill={c.name === "Sherlock" ? "#0f766e" : "#0b1220"}
                      fillOpacity={c.name === "Sherlock" ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 divide-y divide-line border-t border-line">
            {(payload?.competitors ?? []).map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 py-1.5 text-[11px]"
              >
                <span className="truncate text-muted">{c.topHook}</span>
                <span
                  className={`mono font-semibold ${
                    c.weekDelta >= 0 ? "text-signal" : "text-heat"
                  }`}
                >
                  {pct(c.weekDelta)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Needs attention"
          action={
            <Link href="/roster" className="text-[11px] font-medium text-signal">
              Roster →
            </Link>
          }
        >
          <div className="divide-y divide-line">
            {(payload?.atRisk ?? []).slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/creators/${c.id}`}
                className="flex items-center justify-between gap-2 py-1.5 hover:bg-[#f8fafc]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{c.name}</p>
                    <p className="truncate text-[10px] text-muted">
                      {c.postsDone}/{c.postsDue} posts · {c.manager}
                    </p>
                  </div>
                </div>
                <Badge tone={c.standing === "at_risk" ? "heat" : "amber"}>
                  {c.standing.replace("_", " ")}
                </Badge>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Top creators">
          <div className="divide-y divide-line">
            {(payload?.topCreators ?? []).slice(0, 6).map((c, i) => (
              <Link
                key={c.id}
                href={`/creators/${c.id}`}
                className="flex items-center justify-between gap-2 py-1.5 hover:bg-[#f8fafc]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="mono w-3 text-[10px] text-muted">{i + 1}</span>
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{c.name}</p>
                    <p className="truncate text-[10px] text-muted">{c.handle}</p>
                  </div>
                </div>
                <p className="mono text-[12px] font-semibold">
                  {formatUsd(c.revenue30d)}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
