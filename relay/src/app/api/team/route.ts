import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { teamMembers } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = getDb().select().from(teamMembers).all();
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ data: rows });
}
