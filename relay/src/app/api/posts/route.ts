import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, contentPosts, creators } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = getDb();
  const creatorId = new URL(req.url).searchParams.get("creatorId");
  let rows = db
    .select()
    .from(contentPosts)
    .orderBy(desc(contentPosts.postedAt))
    .all();
  if (creatorId) rows = rows.filter((p) => p.creatorId === creatorId);

  const creatorMap = Object.fromEntries(
    db
      .select()
      .from(creators)
      .all()
      .map((c) => [c.id, c]),
  );

  const data = rows.map((p) => ({
    ...p,
    creatorName: creatorMap[p.creatorId]?.name ?? p.creatorId,
    creatorHandle: creatorMap[p.creatorId]?.handle ?? "",
  }));

  return NextResponse.json({ data });
}

const CreateSchema = z.object({
  creatorId: z.string(),
  platform: z.enum(["tiktok", "instagram", "youtube", "other"]),
  caption: z.string().min(1),
  url: z.string().optional(),
  views: z.number().int().nonnegative().default(0),
  installs: z.number().int().nonnegative().default(0),
  postedAt: z.string().optional(),
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
  const id = `cp_${Math.random().toString(36).slice(2, 9)}`;

  db.insert(contentPosts)
    .values({
      id,
      creatorId: body.creatorId,
      platform: body.platform,
      url: body.url ?? "",
      caption: body.caption,
      views: body.views,
      installs: body.installs,
      postedAt: body.postedAt ?? now,
      createdAt: now,
    })
    .run();

  db.update(creators)
    .set({
      lastPostAt: body.postedAt ?? now,
      postsDone: creator.postsDone + 1,
      updatedAt: now,
    })
    .where(eq(creators.id, body.creatorId))
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "content",
      title: `${creator.name} logged a post`,
      detail: body.caption.slice(0, 80),
    })
    .run();

  const row = db.select().from(contentPosts).where(eq(contentPosts.id, id)).get();
  return NextResponse.json({ data: row }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string(),
  views: z.number().int().nonnegative().optional(),
  installs: z.number().int().nonnegative().optional(),
  caption: z.string().min(1).optional(),
  url: z.string().optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const existing = db
    .select()
    .from(contentPosts)
    .where(eq(contentPosts.id, body.id))
    .get();
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (body.views !== undefined) patch.views = body.views;
  if (body.installs !== undefined) patch.installs = body.installs;
  if (body.caption) patch.caption = body.caption;
  if (body.url !== undefined) patch.url = body.url;

  db.update(contentPosts).set(patch).where(eq(contentPosts.id, body.id)).run();
  const row = db
    .select()
    .from(contentPosts)
    .where(eq(contentPosts.id, body.id))
    .get();
  return NextResponse.json({ data: row });
}
