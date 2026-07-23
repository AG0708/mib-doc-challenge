import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, prospects } from "@/db/schema";

export const runtime = "nodejs";

const RowSchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  platform: z.enum(["tiktok", "instagram", "youtube"]).default("tiktok"),
  followers: z.coerce.number().default(0),
  niche: z.string().default("general"),
  owner: z.string().default("Ava"),
  score: z.coerce.number().default(70),
  notes: z.string().default(""),
  email: z.string().optional(),
});

const BodySchema = z.object({
  csv: z.string().min(1).optional(),
  rows: z.array(RowSchema).optional(),
});

function parseCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return {
      name: obj.name ?? "",
      handle: obj.handle ?? "",
      platform: (obj.platform || "tiktok") as "tiktok" | "instagram" | "youtube",
      followers: Number(obj.followers || 0),
      niche: obj.niche || "general",
      owner: obj.owner || "Ava",
      score: Number(obj.score || 70),
      notes: obj.notes || "",
      email: obj.email || undefined,
    };
  });
}

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json());
  const rawRows = body.rows ?? (body.csv ? parseCsv(body.csv) : []);
  if (!rawRows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const created = [];

  for (const raw of rawRows.slice(0, 100)) {
    const row = RowSchema.parse(raw);
    const id = `p_${Math.random().toString(36).slice(2, 9)}`;
    const handle = row.handle.startsWith("@") ? row.handle : `@${row.handle}`;
    db.insert(prospects)
      .values({
        id,
        name: row.name,
        handle,
        platform: row.platform,
        followers: row.followers,
        niche: row.niche,
        stage: "sourced",
        owner: row.owner,
        lastTouch: now,
        notes: row.notes,
        score: row.score,
        email: row.email ?? null,
        source: "csv_import",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    created.push(id);
  }

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "outreach",
      title: `Imported ${created.length} prospects`,
      detail: "CSV / bulk import → sourced",
    })
    .run();

  return NextResponse.json({ data: { imported: created.length, ids: created } }, { status: 201 });
}
