import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const SECRET = process.env.RELAY_WEBHOOK_SECRET || "relay_dev_secret";

const BodySchema = z.object({
  creator_id: z.string().min(1),
  step: z.string().min(1),
  valid: z.boolean().default(true),
});

export async function POST(req: Request) {
  const input = BodySchema.parse(await req.json());
  const payload = {
    event: "step.completed",
    creator_id: input.creator_id,
    step: input.step,
    occurred_at: new Date().toISOString(),
    idempotency_key: `ob_${input.creator_id}_${input.step}_${Date.now()}`,
  };
  const body = JSON.stringify(payload);
  const signature = input.valid
    ? `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`
    : "sha256=deadbeefinvalidsignature";

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/webhooks/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Relay-Signature": signature,
    },
    body,
  });

  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}
