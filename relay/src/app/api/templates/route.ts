import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, messageTemplates } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = getDb().select().from(messageTemplates).all();
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ data: rows });
}

const CreateSchema = z.object({
  name: z.string().min(2),
  channel: z.enum(["dm", "email", "slack"]).default("dm"),
  body: z.string().min(4),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const id = `tpl_${Math.random().toString(36).slice(2, 9)}`;

  db.insert(messageTemplates)
    .values({
      id,
      name: body.name,
      channel: body.channel,
      body: body.body,
      updatedAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "outreach",
      title: "Template created",
      detail: body.name,
    })
    .run();

  const row = db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, id))
    .get();
  return NextResponse.json({ data: row }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  channel: z.enum(["dm", "email", "slack"]).optional(),
  body: z.string().min(4).optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const existing = db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, body.id))
    .get();
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (body.name) patch.name = body.name;
  if (body.channel) patch.channel = body.channel;
  if (body.body) patch.body = body.body;

  db.update(messageTemplates)
    .set(patch)
    .where(eq(messageTemplates.id, body.id))
    .run();

  const row = db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, body.id))
    .get();
  return NextResponse.json({ data: row });
}
