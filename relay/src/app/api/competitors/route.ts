import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, competitorPulse } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = getDb().select().from(competitorPulse).all();
  return NextResponse.json({ data: rows });
}

const UpsertSchema = z.object({
  name: z.string().min(1),
  shareOfVoice: z.number(),
  weekDelta: z.number(),
  topHook: z.string().min(1),
});

export async function PUT(req: Request) {
  const body = UpsertSchema.parse(await req.json());
  const db = getDb();
  const existing = db
    .select()
    .from(competitorPulse)
    .where(eq(competitorPulse.name, body.name))
    .get();

  if (existing) {
    db.update(competitorPulse)
      .set({
        shareOfVoice: body.shareOfVoice,
        weekDelta: body.weekDelta,
        topHook: body.topHook,
      })
      .where(eq(competitorPulse.name, body.name))
      .run();
  } else {
    db.insert(competitorPulse)
      .values({
        name: body.name,
        shareOfVoice: body.shareOfVoice,
        weekDelta: body.weekDelta,
        topHook: body.topHook,
      })
      .run();
  }

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: new Date().toISOString(),
      kind: "alert",
      title: "Competitor pulse updated",
      detail: `${body.name} · SoV ${body.shareOfVoice}%`,
    })
    .run();

  const row = db
    .select()
    .from(competitorPulse)
    .where(eq(competitorPulse.name, body.name))
    .get();
  return NextResponse.json({ data: row });
}
