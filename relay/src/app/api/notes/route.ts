import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, entityNotes } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  let rows = db
    .select()
    .from(entityNotes)
    .orderBy(desc(entityNotes.createdAt))
    .all();
  if (entityType) rows = rows.filter((n) => n.entityType === entityType);
  if (entityId) rows = rows.filter((n) => n.entityId === entityId);

  return NextResponse.json({ data: rows });
}

const CreateSchema = z.object({
  entityType: z.enum(["creator", "prospect"]),
  entityId: z.string().min(1),
  body: z.string().min(1).max(2000),
  author: z.string().default("Ava"),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const id = `n_${Math.random().toString(36).slice(2, 9)}`;

  db.insert(entityNotes)
    .values({
      id,
      entityType: body.entityType,
      entityId: body.entityId,
      author: body.author,
      body: body.body,
      createdAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "crm",
      title: "Note added",
      detail: body.body.slice(0, 100),
    })
    .run();

  const row = db.select().from(entityNotes).where(eq(entityNotes.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  getDb().delete(entityNotes).where(eq(entityNotes.id, id)).run();
  return NextResponse.json({ data: { ok: true } });
}
