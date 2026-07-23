"use client";

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
import { formatCompact, formatUsd } from "@/lib/utils";
import type { DailyMetric } from "@/data/types";

const tooltipStyle = {
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(13,20,32,0.1)",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(13,20,32,0.08)",
  fontSize: 12,
};

export function FunnelChart({ data }: { data: DailyMetric[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0fb981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0fb981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="installsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5a2a" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#ff5a2a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(13,20,32,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v.slice(5)}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              formatCompact(Number(value ?? 0)),
              String(name),
            ]}
            labelFormatter={(l) => String(l)}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="views"
            name="Views"
            stroke="#0fb981"
            fill="url(#viewsFill)"
            strokeWidth={2}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="installs"
            name="Installs"
            stroke="#ff5a2a"
            fill="url(#installsFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data }: { data: DailyMetric[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(13,20,32,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v.slice(5)}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v) => `$${formatCompact(v)}`}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatUsd(Number(value ?? 0)), "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0d1420"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4, fill: "#0fb981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AttributionBars({
  rows,
}: {
  rows: { name: string; installs: number; webVisits: number; revenue: number }[];
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(13,20,32,0.06)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fill: "#5b6a7e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="installs" name="Installs" fill="#0fb981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="webVisits" name="Web visits" fill="#0d1420" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetitorBars({
  rows,
}: {
  rows: { name: string; shareOfVoice: number; weekDelta: number }[];
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: "#2a3548", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="shareOfVoice" name="Share of voice %" radius={[0, 8, 8, 0]}>
            {rows.map((row) => (
              <Cell
                key={row.name}
                fill={row.name === "Sherlock" ? "#0fb981" : "#0d1420"}
                fillOpacity={row.name === "Sherlock" ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
