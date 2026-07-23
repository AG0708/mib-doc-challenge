import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activity, prospects } from "@/db/schema";

export const runtime = "nodejs";

const BulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  stage: z.string().optional(),
  owner: z.string().optional(),
});

export async function PATCH(req: Request) {
  const body = BulkSchema.parse(await req.json());
  if (!body.stage && !body.owner) {
    return NextResponse.json(
      { error: "stage or owner required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updatedAt: now,
    lastTouch: now,
  };
  if (body.stage) patch.stage = body.stage;
  if (body.owner) patch.owner = body.owner;

  db.update(prospects)
    .set(patch)
    .where(inArray(prospects.id, body.ids))
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "outreach",
      title: `Bulk updated ${body.ids.length} prospects`,
      detail: [
        body.stage ? `stage → ${body.stage}` : null,
        body.owner ? `owner → ${body.owner}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })
    .run();

  const rows = body.ids
    .map((id) => db.select().from(prospects).where(eq(prospects.id, id)).get())
    .filter(Boolean);

  return NextResponse.json({ data: rows });
}
