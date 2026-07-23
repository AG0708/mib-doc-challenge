import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { creators, payouts, prospects, tasks } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const now = Date.now();
  const alerts: {
    id: string;
    severity: "high" | "med" | "low";
    title: string;
    detail: string;
    href: string;
  }[] = [];

  for (const c of db.select().from(creators).all()) {
    if (c.standing === "at_risk") {
      alerts.push({
        id: `alert_risk_${c.id}`,
        severity: "high",
        title: `${c.name} at risk`,
        detail: `Cadence ${c.postsDone}/${c.postsDue} · ${c.manager}`,
        href: `/creators/${c.id}`,
      });
    } else if (c.postsDue > 0 && c.postsDone / c.postsDue < 0.5) {
      alerts.push({
        id: `alert_cadence_${c.id}`,
        severity: "med",
        title: `${c.name} behind on posts`,
        detail: `${c.postsDone}/${c.postsDue} fulfilled`,
        href: `/creators/${c.id}`,
      });
    }
  }

  for (const p of db.select().from(prospects).all()) {
    if (p.stage === "call_booked") {
      alerts.push({
        id: `alert_call_${p.id}`,
        severity: "med",
        title: `Call booked · ${p.name}`,
        detail: `Owner ${p.owner} · score ${p.score}`,
        href: "/outreach",
      });
    }
  }

  for (const t of db.select().from(tasks).all()) {
    if (t.status !== "open") continue;
    const due = t.dueAt ? Date.parse(t.dueAt) : NaN;
    if (!Number.isNaN(due) && due < now) {
      alerts.push({
        id: `alert_task_${t.id}`,
        severity: t.priority === "high" ? "high" : "med",
        title: `Overdue · ${t.title}`,
        detail: `Assignee ${t.assignee}`,
        href: "/tasks",
      });
    }
  }

  const queued = db
    .select()
    .from(payouts)
    .all()
    .filter((p) => p.status === "queued");
  if (queued.length >= 3) {
    alerts.push({
      id: "alert_payouts",
      severity: "low",
      title: `${queued.length} payouts queued`,
      detail: "Review financials before payroll cut",
      href: "/financials",
    });
  }

  const rank = { high: 0, med: 1, low: 2 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return NextResponse.json({ data: alerts.slice(0, 20) });
}
