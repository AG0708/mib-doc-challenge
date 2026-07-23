import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, creators, prospects, tasks } from "@/db/schema";

export const runtime = "nodejs";

const BodySchema = z.object({
  manager: z.string().optional(),
  rate: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const db = getDb();
  const prospect = db.select().from(prospects).where(eq(prospects.id, id)).get();
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const existing = db
    .select()
    .from(creators)
    .all()
    .find((c) => c.handle.toLowerCase() === prospect.handle.toLowerCase());
  if (existing) {
    return NextResponse.json(
      { error: "Creator already exists for this handle", data: existing },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const creatorId = `c_${Math.random().toString(36).slice(2, 9)}`;
  const manager = body.manager ?? prospect.owner;
  const slug = prospect.handle.replace(/^@/, "").toLowerCase();

  db.insert(creators)
    .values({
      id: creatorId,
      name: prospect.name,
      handle: prospect.handle,
      platform: prospect.platform,
      stage: "signed",
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
      manager,
      lastPostAt: null,
      city: body.city ?? "",
      email: prospect.email ?? `${slug}@creators.relay`,
      deepLink: `https://sherlock.app/c/${slug}`,
      timezone: "America/New_York",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.update(prospects)
    .set({
      stage: "closed_won",
      notes: `${prospect.notes}\n\n[Converted → ${creatorId}]`.trim(),
      lastTouch: now,
      updatedAt: now,
    })
    .where(eq(prospects.id, id))
    .run();

  db.insert(tasks)
    .values({
      id: `t_${Math.random().toString(36).slice(2, 9)}`,
      title: `Kick off onboarding for ${prospect.name}`,
      status: "open",
      priority: "high",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      assignee: manager,
      entityType: "creator",
      entityId: creatorId,
      entityLabel: prospect.name,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "crm",
      title: `${prospect.name} converted to creator`,
      detail: `${prospect.handle} → ${creatorId} (signed)`,
    })
    .run();

  const creator = db
    .select()
    .from(creators)
    .where(eq(creators.id, creatorId))
    .get();

  return NextResponse.json(
    { data: { creator, prospectId: id } },
    { status: 201 },
  );
}
