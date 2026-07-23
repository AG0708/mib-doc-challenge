"use client";

import { useMemo, useState } from "react";
import { dailyMetrics } from "@/data/seed";
import { useOps } from "@/lib/ops-store";
import { formatCompact, formatUsd, cn } from "@/lib/utils";
import {
  PageHeader,
  SectionTitle,
  Badge,
  StatBlock,
  Button,
  Avatar,
} from "@/components/ui/primitives";
import { AttributionBars, RevenueChart } from "@/components/charts/Charts";

const STATUS_TONE = {
  paid: "signal" as const,
  processing: "amber" as const,
  queued: "neutral" as const,
  hold: "heat" as const,
};

export default function FinancialsPage() {
  const { creators, payouts, setPayoutStatus } = useOps();
  const [status, setStatus] = useState("all");

  const queue = useMemo(
    () =>
      payouts.filter((p) => (status === "all" ? true : p.status === status)),
    [status, payouts],
  );

  const payrollDue = payouts
    .filter((p) => p.status === "queued" || p.status === "processing")
    .reduce((s, p) => s + p.amount, 0);
  const paid = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const held = payouts
    .filter((p) => p.status === "hold")
    .reduce((s, p) => s + p.amount, 0);
  const rev30 = dailyMetrics.reduce((s, d) => s + d.revenue, 0);

  const attribution = [...creators]
    .filter((c) => c.stage === "live")
    .sort((a, b) => b.revenue30d - a.revenue30d)
    .slice(0, 6)
    .map((c) => ({
      name: c.name.split(" ")[0],
      installs: c.installs30d,
      webVisits: c.webVisits30d,
      revenue: c.revenue30d,
    }));

  function approveBatch() {
    payouts
      .filter((p) => p.status === "queued")
      .forEach((p) => setPayoutStatus(p.id, "processing"));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Money · Financials"
        title="Payroll meets attribution."
        description="What creators are owed, what content converted, and what is held for review."
        action={
          <Button tone="ink" onClick={approveBatch}>
            Process queued batch
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Revenue 30d"
          value={formatUsd(rev30)}
          hint="attributed"
          spark={dailyMetrics.slice(-12).map((d) => d.revenue)}
        />
        <StatBlock label="Payroll queued" value={formatUsd(payrollDue)} hint="next batch" />
        <StatBlock label="Paid this cycle" value={formatUsd(paid)} delta="cleared" />
        <StatBlock label="On hold" value={formatUsd(held)} hint="policy review" />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <section className="panel rounded-2xl p-4 md:p-5">
          <SectionTitle
            title="Creator attribution"
            aside={
              <span className="text-xs text-muted">installs vs web visits</span>
            }
          />
          <AttributionBars rows={attribution} />
        </section>
        <section className="panel rounded-2xl p-4 md:p-5">
          <SectionTitle title="Daily revenue" />
          <RevenueChart data={dailyMetrics} />
        </section>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Payout ledger" />
        <div className="flex flex-wrap gap-1.5">
          {["all", "queued", "processing", "paid", "hold"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
                status === s
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white/70",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-white/50 text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p) => (
                <tr key={p.id} className="border-b border-line/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.creatorName} size="sm" />
                      <span className="font-medium">{p.creatorName}</span>
                    </div>
                  </td>
                  <td className="mono px-4 py-3 text-muted">{p.period}</td>
                  <td className="mono px-4 py-3">{formatCompact(p.views)}</td>
                  <td className="mono px-4 py-3 font-semibold">
                    {formatUsd(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {p.status !== "paid" && (
                        <Button
                          size="sm"
                          tone="signal"
                          onClick={() => setPayoutStatus(p.id, "paid")}
                        >
                          Mark paid
                        </Button>
                      )}
                      {p.status !== "hold" && p.status !== "paid" && (
                        <Button
                          size="sm"
                          tone="heat"
                          onClick={() => setPayoutStatus(p.id, "hold")}
                        >
                          Hold
                        </Button>
                      )}
                      {p.status === "hold" && (
                        <Button
                          size="sm"
                          onClick={() => setPayoutStatus(p.id, "queued")}
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
