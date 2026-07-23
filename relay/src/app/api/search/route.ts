import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { creators, payouts, prospects } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!q || q.length < 1) {
    return NextResponse.json({ data: { results: [] } });
  }

  const db = getDb();
  const prospectHits = db
    .select()
    .from(prospects)
    .all()
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.niche.toLowerCase().includes(q),
    )
    .slice(0, 6)
    .map((p) => ({
      type: "prospect" as const,
      id: p.id,
      title: p.name,
      subtitle: `${p.handle} · ${p.stage}`,
      href: "/outreach",
    }));

  const creatorHits = db
    .select()
    .from(creators)
    .all()
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    )
    .slice(0, 6)
    .map((c) => ({
      type: "creator" as const,
      id: c.id,
      title: c.name,
      subtitle: `${c.handle} · ${c.stage}`,
      href: `/creators/${c.id}`,
    }));

  const payoutHits = db
    .select()
    .from(payouts)
    .all()
    .filter((p) => p.creatorName.toLowerCase().includes(q))
    .slice(0, 4)
    .map((p) => ({
      type: "payout" as const,
      id: p.id,
      title: p.creatorName,
      subtitle: `${p.status} · $${p.amount}`,
      href: "/financials",
    }));

  return NextResponse.json({
    data: { results: [...creatorHits, ...prospectHits, ...payoutHits].slice(0, 12) },
  });
}
