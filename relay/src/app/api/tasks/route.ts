import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, tasks } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignee = searchParams.get("assignee");

  let rows = db.select().from(tasks).orderBy(asc(tasks.dueAt)).all();
  if (status && status !== "all") rows = rows.filter((t) => t.status === status);
  if (assignee && assignee !== "all")
    rows = rows.filter((t) => t.assignee === assignee);

  return NextResponse.json({ data: rows });
}

const CreateSchema = z.object({
  title: z.string().min(2),
  priority: z.enum(["low", "med", "high"]).default("med"),
  dueAt: z.string().optional(),
  assignee: z.string().default("Ava"),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  entityLabel: z.string().optional(),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const id = `t_${Math.random().toString(36).slice(2, 9)}`;

  db.insert(tasks)
    .values({
      id,
      title: body.title,
      status: "open",
      priority: body.priority,
      dueAt: body.dueAt ?? now,
      assignee: body.assignee,
      entityType: body.entityType ?? null,
      entityId: body.entityId ?? null,
      entityLabel: body.entityLabel ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "alert",
      title: "Task created",
      detail: body.title,
    })
    .run();

  const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string(),
  status: z.enum(["open", "done"]).optional(),
  priority: z.enum(["low", "med", "high"]).optional(),
  title: z.string().min(2).optional(),
  dueAt: z.string().optional(),
  assignee: z.string().optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.select().from(tasks).where(eq(tasks.id, body.id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updatedAt: now };
  if (body.status) patch.status = body.status;
  if (body.priority) patch.priority = body.priority;
  if (body.title) patch.title = body.title;
  if (body.dueAt) patch.dueAt = body.dueAt;
  if (body.assignee) patch.assignee = body.assignee;

  db.update(tasks).set(patch).where(eq(tasks.id, body.id)).run();

  if (body.status === "done") {
    db.insert(activity)
      .values({
        id: `a_${Math.random().toString(36).slice(2, 9)}`,
        at: now,
        kind: "alert",
        title: "Task completed",
        detail: existing.title,
      })
      .run();
  }

  const row = db.select().from(tasks).where(eq(tasks.id, body.id)).get();
  return NextResponse.json({ data: row });
}
