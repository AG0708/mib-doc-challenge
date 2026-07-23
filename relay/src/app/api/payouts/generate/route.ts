import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, creators, payouts } from "@/db/schema";

export const runtime = "nodejs";

const BodySchema = z.object({
  period: z.string().optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const db = getDb();
  const now = new Date();
  const period =
    body.period ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const ts = now.toISOString();

  const live = db
    .select()
    .from(creators)
    .all()
    .filter((c) => ["live", "first_post"].includes(c.stage));

  const existing = new Set(
    db
      .select()
      .from(payouts)
      .all()
      .filter((p) => p.period === period)
      .map((p) => p.creatorId),
  );

  const created = [];
  for (const c of live) {
    if (existing.has(c.id)) continue;
    const amount =
      c.nextPayout > 0
        ? c.nextPayout
        : Math.max(150, Math.round(c.revenue30d * 0.15));
    const id = `pay_${Math.random().toString(36).slice(2, 9)}`;
    db.insert(payouts)
      .values({
        id,
        creatorId: c.id,
        creatorName: c.name,
        period,
        views: c.views30d,
        amount,
        status: "queued",
        updatedAt: ts,
        createdAt: ts,
      })
      .run();
    created.push(id);
  }

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: ts,
      kind: "finance",
      title: `Generated ${created.length} payouts`,
      detail: `Period ${period}`,
    })
    .run();

  return NextResponse.json(
    { data: { period, created: created.length, ids: created } },
    { status: 201 },
  );
}
