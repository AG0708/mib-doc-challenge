import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-relay-signature");
  const valid = verify(signature, body);

  let payload: {
    event?: string;
    creator_id?: string;
    step?: string;
    idempotency_key?: string;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!valid) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_signature",
        hint: "Sign with HMAC-SHA256 using RELAY_WEBHOOK_SECRET",
      },
      { status: 401 },
    );
  }

  if (!payload.creator_id || !payload.event) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    applied: {
      creator_id: payload.creator_id,
      event: payload.event,
      step: payload.step ?? null,
      idempotency_key: payload.idempotency_key ?? null,
    },
    received_at: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/onboarding",
    auth: "X-Relay-Signature: sha256=<hmac>",
    secret_env: "RELAY_WEBHOOK_SECRET",
    sample_step: "payment_connected",
  });
}
