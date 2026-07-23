import { NextResponse } from "next/server";
import { getDb, getSqlite } from "@/db";
import {
  activity,
  contentPosts,
  creators,
  dailyMetrics,
  entityNotes,
  messageTemplates,
  payouts,
  prospects,
  tasks,
  teamMembers,
  webhookEvents,
} from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const sqlite = getSqlite();
  const tables = {
    prospects: db.select().from(prospects).all().length,
    creators: db.select().from(creators).all().length,
    payouts: db.select().from(payouts).all().length,
    daily_metrics: db.select().from(dailyMetrics).all().length,
    activity: db.select().from(activity).all().length,
    webhook_events: db.select().from(webhookEvents).all().length,
    tasks: db.select().from(tasks).all().length,
    entity_notes: db.select().from(entityNotes).all().length,
    content_posts: db.select().from(contentPosts).all().length,
    message_templates: db.select().from(messageTemplates).all().length,
    team_members: db.select().from(teamMembers).all().length,
  };

  return NextResponse.json({
    data: {
      ok: true,
      driver: "better-sqlite3",
      journalMode: sqlite.pragma("journal_mode", { simple: true }),
      tables,
      connected: true,
    },
  });
}
