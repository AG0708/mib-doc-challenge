import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  contentPosts,
  creators,
  entityNotes,
  payouts,
  tasks,
} from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = getDb();
  const creator = db.select().from(creators).where(eq(creators.id, id)).get();
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const notes = db
    .select()
    .from(entityNotes)
    .where(eq(entityNotes.entityId, id))
    .all()
    .filter((n) => n.entityType === "creator")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const posts = db
    .select()
    .from(contentPosts)
    .where(eq(contentPosts.creatorId, id))
    .orderBy(desc(contentPosts.postedAt))
    .all();

  const creatorTasks = db
    .select()
    .from(tasks)
    .all()
    .filter((t) => t.entityType === "creator" && t.entityId === id)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  const creatorPayouts = db
    .select()
    .from(payouts)
    .where(eq(payouts.creatorId, id))
    .all();

  return NextResponse.json({
    data: {
      creator,
      notes,
      posts,
      tasks: creatorTasks,
      payouts: creatorPayouts,
    },
  });
}
