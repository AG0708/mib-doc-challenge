import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  contentPosts,
  creators,
  messageTemplates,
  payouts,
  prospects,
  tasks,
  webhookEvents,
} from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const allProspects = db.select().from(prospects).all();
  const allCreators = db.select().from(creators).all();
  const allPayouts = db.select().from(payouts).all();
  const allWebhooks = db.select().from(webhookEvents).all();
  const allTasks = db.select().from(tasks).all();
  const allPosts = db.select().from(contentPosts).all();
  const allTemplates = db.select().from(messageTemplates).all();

  return NextResponse.json({
    data: {
      prospects: allProspects.length,
      creators: allCreators.length,
      live: allCreators.filter((c) => c.stage === "live").length,
      queuedPayouts: allPayouts.filter((p) =>
        ["queued", "processing"].includes(p.status),
      ).length,
      webhooks: allWebhooks.length,
      callBooked: allProspects.filter((p) => p.stage === "call_booked").length,
      atRisk: allCreators.filter((c) =>
        ["watch", "at_risk"].includes(c.standing),
      ).length,
      openTasks: allTasks.filter((t) => t.status === "open").length,
      posts: allPosts.length,
      templates: allTemplates.length,
      dbPath: process.env.RELAY_DB_PATH ?? "data/relay.db",
      webhookSecretConfigured: Boolean(process.env.RELAY_WEBHOOK_SECRET),
    },
  });
}
