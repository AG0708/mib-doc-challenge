import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  activity,
  competitorPulse,
  creators,
  dailyMetrics,
} from "@/db/schema";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const days = Number(new URL(req.url).searchParams.get("days") ?? "30");
  const metrics = db
    .select()
    .from(dailyMetrics)
    .orderBy(dailyMetrics.date)
    .all()
    .slice(-Math.max(7, Math.min(days, 90)));

  const totals = metrics.reduce(
    (acc, m) => {
      acc.views += m.views;
      acc.installs += m.installs;
      acc.webVisits += m.webVisits;
      acc.revenue += m.revenue;
      return acc;
    },
    { views: 0, installs: 0, webVisits: 0, revenue: 0 },
  );

  const liveCreators = db
    .select()
    .from(creators)
    .orderBy(desc(creators.revenue30d))
    .all()
    .filter((c) => c.stage === "live");

  const competitors = db.select().from(competitorPulse).all();
  const feed = db
    .select()
    .from(activity)
    .orderBy(desc(activity.at))
    .limit(20)
    .all();

  return NextResponse.json({
    data: {
      rangeDays: days,
      metrics,
      totals,
      conversion: {
        viewToInstall: totals.views ? (totals.installs / totals.views) * 100 : 0,
        viewToWeb: totals.views ? (totals.webVisits / totals.views) * 100 : 0,
        revPerInstall: totals.installs ? totals.revenue / totals.installs : 0,
      },
      topCreators: liveCreators.slice(0, 6),
      atRisk: db
        .select()
        .from(creators)
        .all()
        .filter((c) => c.standing === "at_risk" || c.standing === "watch")
        .slice(0, 8),
      competitors,
      activity: feed,
    },
  });
}
