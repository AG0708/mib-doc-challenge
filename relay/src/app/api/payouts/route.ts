import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, payouts } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const status = new URL(req.url).searchParams.get("status");
  let rows = db.select().from(payouts).orderBy(desc(payouts.updatedAt)).all();
  if (status && status !== "all") rows = rows.filter((r) => r.status === status);
  return NextResponse.json({ data: rows });
}

const PatchSchema = z.object({
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  status: z.enum(["queued", "processing", "paid", "hold"]),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const ids = body.ids ?? (body.id ? [body.id] : []);
  if (!ids.length) {
    return NextResponse.json({ error: "id or ids required" }, { status: 400 });
  }

  for (const id of ids) {
    db.update(payouts)
      .set({ status: body.status, updatedAt: now })
      .where(eq(payouts.id, id))
      .run();
  }

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "finance",
      title: `Payouts → ${body.status}`,
      detail: `${ids.length} row(s) updated`,
    })
    .run();

  const rows = db.select().from(payouts).all();
  return NextResponse.json({
    data: rows.filter((r) => ids.includes(r.id)),
  });
}
