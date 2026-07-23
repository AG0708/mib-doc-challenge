import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, creators, payouts } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const status = new URL(req.url).searchParams.get("status");
  let rows = db.select().from(payouts).orderBy(desc(payouts.updatedAt)).all();
  if (status && status !== "all") rows = rows.filter((r) => r.status === status);
  return NextResponse.json({ data: rows });
}

const CreateSchema = z.object({
  creatorId: z.string(),
  period: z.string().min(2),
  views: z.number().int().nonnegative().default(0),
  amount: z.number().int().nonnegative(),
  status: z.enum(["queued", "processing", "paid", "hold"]).default("queued"),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const creator = db
    .select()
    .from(creators)
    .where(eq(creators.id, body.creatorId))
    .get();
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const id = `pay_${Math.random().toString(36).slice(2, 9)}`;
  db.insert(payouts)
    .values({
      id,
      creatorId: creator.id,
      creatorName: creator.name,
      period: body.period,
      views: body.views,
      amount: body.amount,
      status: body.status,
      updatedAt: now,
      createdAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "finance",
      title: `Payout created · ${creator.name}`,
      detail: `${body.period} · $${body.amount}`,
    })
    .run();

  const row = db.select().from(payouts).where(eq(payouts.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
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
