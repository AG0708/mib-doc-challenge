import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

const globalForDb = globalThis as unknown as {
  __relaySqlite?: Database.Database;
  __relayDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function dbPath() {
  const custom = process.env.RELAY_DB_PATH;
  if (custom) return custom;
  return path.join(process.cwd(), "data", "relay.db");
}

export function getSqlite() {
  if (!globalForDb.__relaySqlite) {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const sqlite = new Database(file);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    migrate(sqlite);
    globalForDb.__relaySqlite = sqlite;
  }
  return globalForDb.__relaySqlite;
}

export function getDb() {
  if (!globalForDb.__relayDb) {
    const sqlite = getSqlite();
    globalForDb.__relayDb = drizzle(sqlite, { schema });
    seedIfEmpty(globalForDb.__relayDb);
  }
  return globalForDb.__relayDb;
}

export function closeDb() {
  try {
    globalForDb.__relaySqlite?.close();
  } catch {
    /* ignore */
  }
  globalForDb.__relaySqlite = undefined;
  globalForDb.__relayDb = undefined;
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      platform TEXT NOT NULL,
      followers INTEGER NOT NULL DEFAULT 0,
      niche TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'sourced',
      owner TEXT NOT NULL,
      last_touch TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      email TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      platform TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'signed',
      standing TEXT NOT NULL DEFAULT 'watch',
      cpm REAL NOT NULL DEFAULT 0,
      views_30d INTEGER NOT NULL DEFAULT 0,
      installs_30d INTEGER NOT NULL DEFAULT 0,
      web_visits_30d INTEGER NOT NULL DEFAULT 0,
      revenue_30d INTEGER NOT NULL DEFAULT 0,
      posts_due INTEGER NOT NULL DEFAULT 0,
      posts_done INTEGER NOT NULL DEFAULT 0,
      next_payout INTEGER NOT NULL DEFAULT 0,
      rate TEXT NOT NULL DEFAULT '',
      joined_at TEXT NOT NULL,
      manager TEXT NOT NULL,
      last_post_at TEXT,
      city TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      deep_link TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      period TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      date TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      installs INTEGER NOT NULL DEFAULT 0,
      web_visits INTEGER NOT NULL DEFAULT 0,
      revenue INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      source TEXT NOT NULL,
      event TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      step TEXT,
      signature_valid INTEGER NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      raw TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitor_pulse (
      name TEXT PRIMARY KEY,
      share_of_voice REAL NOT NULL,
      week_delta REAL NOT NULL,
      top_hook TEXT NOT NULL
    );
  `);
}

export type Db = ReturnType<typeof getDb>;
