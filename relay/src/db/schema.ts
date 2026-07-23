import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(),
  followers: integer("followers").notNull().default(0),
  niche: text("niche").notNull().default(""),
  stage: text("stage").notNull().default("sourced"),
  owner: text("owner").notNull(),
  lastTouch: text("last_touch").notNull(),
  notes: text("notes").notNull().default(""),
  score: integer("score").notNull().default(0),
  email: text("email"),
  source: text("source"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const creators = sqliteTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(),
  stage: text("stage").notNull().default("signed"),
  standing: text("standing").notNull().default("watch"),
  cpm: real("cpm").notNull().default(0),
  views30d: integer("views_30d").notNull().default(0),
  installs30d: integer("installs_30d").notNull().default(0),
  webVisits30d: integer("web_visits_30d").notNull().default(0),
  revenue30d: integer("revenue_30d").notNull().default(0),
  postsDue: integer("posts_due").notNull().default(0),
  postsDone: integer("posts_done").notNull().default(0),
  nextPayout: integer("next_payout").notNull().default(0),
  rate: text("rate").notNull().default(""),
  joinedAt: text("joined_at").notNull(),
  manager: text("manager").notNull(),
  lastPostAt: text("last_post_at"),
  city: text("city").notNull().default(""),
  email: text("email").notNull(),
  deepLink: text("deep_link").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const payouts = sqliteTable("payouts", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  creatorName: text("creator_name").notNull(),
  period: text("period").notNull(),
  views: integer("views").notNull().default(0),
  amount: integer("amount").notNull().default(0),
  status: text("status").notNull().default("queued"),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyMetrics = sqliteTable("daily_metrics", {
  date: text("date").primaryKey(),
  views: integer("views").notNull().default(0),
  installs: integer("installs").notNull().default(0),
  webVisits: integer("web_visits").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
});

export const activity = sqliteTable("activity", {
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
});

export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  source: text("source").notNull(),
  event: text("event").notNull(),
  creatorId: text("creator_id").notNull(),
  step: text("step"),
  signatureValid: integer("signature_valid", { mode: "boolean" }).notNull(),
  status: text("status").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  raw: text("raw").notNull(),
});

export const competitorPulse = sqliteTable("competitor_pulse", {
  name: text("name").primaryKey(),
  shareOfVoice: real("share_of_voice").notNull(),
  weekDelta: real("week_delta").notNull(),
  topHook: text("top_hook").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"), // open | done
  priority: text("priority").notNull().default("med"), // low | med | high
  dueAt: text("due_at"),
  assignee: text("assignee").notNull(),
  entityType: text("entity_type"), // prospect | creator | none
  entityId: text("entity_id"),
  entityLabel: text("entity_label"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const entityNotes = sqliteTable("entity_notes", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // prospect | creator
  entityId: text("entity_id").notNull(),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const contentPosts = sqliteTable("content_posts", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  platform: text("platform").notNull(),
  url: text("url").notNull().default(""),
  caption: text("caption").notNull().default(""),
  views: integer("views").notNull().default(0),
  installs: integer("installs").notNull().default(0),
  postedAt: text("posted_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messageTemplates = sqliteTable("message_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("dm"), // dm | email | slack
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});
