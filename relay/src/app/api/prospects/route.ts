import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, prospects } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const q = searchParams.get("q")?.toLowerCase();

  let rows = db.select().from(prospects).orderBy(desc(prospects.score)).all();
  if (owner && owner !== "all") rows = rows.filter((r) => r.owner === owner);
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.handle.toLowerCase().includes(q) ||
        r.niche.toLowerCase().includes(q),
    );
  }
  return NextResponse.json({ data: rows });
}

const PatchSchema = z.object({
  id: z.string(),
  stage: z.string().optional(),
  notes: z.string().optional(),
  owner: z.string().optional(),
  score: z.number().optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: now, lastTouch: now };
  if (body.stage) patch.stage = body.stage;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.owner) patch.owner = body.owner;
  if (body.score !== undefined) patch.score = body.score;

  db.update(prospects).set(patch).where(eq(prospects.id, body.id)).run();
  const row = db.select().from(prospects).where(eq(prospects.id, body.id)).get();

  if (body.stage) {
    db.insert(activity)
      .values({
        id: `a_${Math.random().toString(36).slice(2, 9)}`,
        at: now,
        kind: "outreach",
        title: `${row?.name ?? "Prospect"} → ${body.stage}`,
        detail: `Stage updated by ops`,
      })
      .run();
  }

  return NextResponse.json({ data: row });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  platform: z.enum(["tiktok", "instagram", "youtube"]),
  followers: z.number().default(0),
  niche: z.string().default("general"),
  owner: z.string(),
  notes: z.string().default(""),
  score: z.number().default(72),
  email: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const id = `p_${Math.random().toString(36).slice(2, 9)}`;
  const handle = body.handle.startsWith("@") ? body.handle : `@${body.handle}`;

  db.insert(prospects)
    .values({
      id,
      name: body.name,
      handle,
      platform: body.platform,
      followers: body.followers,
      niche: body.niche,
      stage: "sourced",
      owner: body.owner,
      lastTouch: now,
      notes: body.notes,
      score: body.score,
      email: body.email ?? null,
      source: body.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(prospects).where(eq(prospects.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
}
