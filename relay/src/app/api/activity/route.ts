import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { activity, webhookEvents } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const feed = db
    .select()
    .from(activity)
    .orderBy(desc(activity.at))
    .limit(40)
    .all();
  const webhooks = db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.at))
    .limit(40)
    .all();
  return NextResponse.json({ data: { activity: feed, webhooks } });
}
