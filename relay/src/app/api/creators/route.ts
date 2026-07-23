import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, creators } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const manager = searchParams.get("manager");
  const stage = searchParams.get("stage");
  const standing = searchParams.get("standing");
  const q = searchParams.get("q")?.toLowerCase();

  let rows = db.select().from(creators).orderBy(desc(creators.revenue30d)).all();
  if (manager && manager !== "all") rows = rows.filter((r) => r.manager === manager);
  if (stage && stage !== "all") rows = rows.filter((r) => r.stage === stage);
  if (standing && standing !== "all")
    rows = rows.filter((r) => r.standing === standing);
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.handle.toLowerCase().includes(q),
    );
  }
  return NextResponse.json({ data: rows });
}

const PatchSchema = z.object({
  id: z.string(),
  stage: z.string().optional(),
  standing: z.string().optional(),
  manager: z.string().optional(),
  postsDone: z.number().optional(),
  postsDue: z.number().optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (body.stage) patch.stage = body.stage;
  if (body.standing) patch.standing = body.standing;
  if (body.manager) patch.manager = body.manager;
  if (body.postsDone !== undefined) patch.postsDone = body.postsDone;
  if (body.postsDue !== undefined) patch.postsDue = body.postsDue;

  db.update(creators).set(patch).where(eq(creators.id, body.id)).run();
  const row = db.select().from(creators).where(eq(creators.id, body.id)).get();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "crm",
      title: `${row?.name ?? "Creator"} updated`,
      detail: body.stage
        ? `Stage → ${body.stage}`
        : body.standing
          ? `Standing → ${body.standing}`
          : "Record patched",
    })
    .run();

  return NextResponse.json({ data: row });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  platform: z.enum(["tiktok", "instagram", "youtube"]),
  manager: z.string(),
  email: z.string().optional(),
  city: z.string().optional(),
  rate: z.string().optional(),
  stage: z.string().optional(),
});

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();
  const id = `c_${Math.random().toString(36).slice(2, 9)}`;
  const handle = body.handle.startsWith("@") ? body.handle : `@${body.handle}`;
  const slug = handle.replace(/^@/, "").toLowerCase();

  db.insert(creators)
    .values({
      id,
      name: body.name,
      handle,
      platform: body.platform,
      stage: body.stage ?? "signed",
      standing: "watch",
      cpm: 0,
      views30d: 0,
      installs30d: 0,
      webVisits30d: 0,
      revenue30d: 0,
      postsDue: 4,
      postsDone: 0,
      nextPayout: 0,
      rate: body.rate ?? "Rev-share pilot",
      joinedAt: now.slice(0, 10),
      manager: body.manager,
      lastPostAt: null,
      city: body.city ?? "",
      email: body.email ?? `${slug}@creators.relay`,
      deepLink: `https://sherlock.app/c/${slug}`,
      timezone: "America/New_York",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "crm",
      title: `${body.name} added to CRM`,
      detail: `${handle} · signed`,
    })
    .run();

  const row = db.select().from(creators).where(eq(creators.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
}
