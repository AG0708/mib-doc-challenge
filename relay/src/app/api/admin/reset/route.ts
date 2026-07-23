import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { closeDb, getDb } from "@/db";

export const runtime = "nodejs";

export async function POST() {
  const file =
    process.env.RELAY_DB_PATH ?? path.join(process.cwd(), "data", "relay.db");
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(file + suffix);
    } catch {
      /* ignore */
    }
  }
  getDb();
  return NextResponse.json({ ok: true, reset: true });
}
