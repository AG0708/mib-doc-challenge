import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activity, creators, tasks, webhookEvents } from "@/db/schema";
import { STEP_TO_STAGE } from "@/data/seed";

export const runtime = "nodejs";

const SECRET = process.env.RELAY_WEBHOOK_SECRET || "relay_dev_secret";

function verify(signature: string | null, body: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", SECRET).update(body).digest("hex");
  const got = signature.slice("sha256=".length);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/onboarding",
    simulate: "/api/webhooks/onboarding/simulate",
    auth: "X-Relay-Signature: sha256=<hmac>",
    secret_env: "RELAY_WEBHOOK_SECRET",
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-relay-signature");
  const valid = verify(signature, body);
  const db = getDb();
  const now = new Date().toISOString();

  let payload: {
    event?: string;
    creator_id?: string;
    step?: string;
    idempotency_key?: string;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const idem =
    payload.idempotency_key ??
    `auto_${payload.creator_id ?? "x"}_${Date.now()}`;

  const existing = db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.idempotencyKey, idem))
    .get();
  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      applied: existing,
    });
  }

  if (!valid) {
    db.insert(webhookEvents)
      .values({
        id: `wh_${Math.random().toString(36).slice(2, 9)}`,
        at: now,
        source: "web_onboarding",
        event: payload.event ?? "unknown",
        creatorId: payload.creator_id ?? "unknown",
        step: payload.step ?? null,
        signatureValid: false,
        status: "rejected",
        idempotencyKey: idem,
        raw: body,
      })
      .run();
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 },
    );
  }

  if (!payload.creator_id || !payload.event) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });
  }

  const creator = db
    .select()
    .from(creators)
    .where(eq(creators.id, payload.creator_id))
    .get();
  if (!creator) {
    db.insert(webhookEvents)
      .values({
        id: `wh_${Math.random().toString(36).slice(2, 9)}`,
        at: now,
        source: "web_onboarding",
        event: payload.event,
        creatorId: payload.creator_id,
        step: payload.step ?? null,
        signatureValid: true,
        status: "rejected",
        idempotencyKey: idem,
        raw: body,
      })
      .run();
    return NextResponse.json(
      { ok: false, error: "creator_not_found" },
      { status: 404 },
    );
  }

  const stage =
    payload.step && STEP_TO_STAGE[payload.step]
      ? STEP_TO_STAGE[payload.step]
      : null;

  if (stage) {
    const patch: Record<string, unknown> = { stage, updatedAt: now };
    if (stage === "live" && creator.standing === "watch") {
      patch.standing = "strong";
    }
    db.update(creators)
      .set(patch)
      .where(eq(creators.id, payload.creator_id))
      .run();
  }

  if (payload.step === "go_live") {
    db.insert(tasks)
      .values({
        id: `t_${Math.random().toString(36).slice(2, 9)}`,
        title: `Welcome kit + first brief for ${creator.name}`,
        status: "open",
        priority: "high",
        dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        assignee: creator.manager,
        entityType: "creator",
        entityId: creator.id,
        entityLabel: creator.name,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const id = `wh_${Math.random().toString(36).slice(2, 9)}`;
  db.insert(webhookEvents)
    .values({
      id,
      at: now,
      source: "web_onboarding",
      event: payload.event,
      creatorId: payload.creator_id,
      step: payload.step ?? null,
      signatureValid: true,
      status: "applied",
      idempotencyKey: idem,
      raw: body,
    })
    .run();

  db.insert(activity)
    .values({
      id: `a_${Math.random().toString(36).slice(2, 9)}`,
      at: now,
      kind: "crm",
      title: `Webhook ${payload.step ?? payload.event}`,
      detail: `${creator.name} applied${stage ? ` → ${stage}` : ""}`,
    })
    .run();

  return NextResponse.json({
    ok: true,
    applied: {
      id,
      creator_id: payload.creator_id,
      creator_name: creator.name,
      step: payload.step ?? null,
      stage,
      received_at: now,
    },
  });
}
