"use client";

import { useState } from "react";
import { WEBHOOK_SECRET } from "@/data/types";
import { useOps } from "@/lib/ops-store";
import { Button, Field, Select, Badge } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/time";
import type { WebhookEvent } from "@/data/types";

async function signBody(body: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

export function WebhookConsole() {
  const { creators, webhooks, applyWebhookLocally, pushToast } = useOps();
  const [creatorId, setCreatorId] = useState("c6");
  const [step, setStep] = useState("payment_connected");
  const [busy, setBusy] = useState(false);
  const [lastResponse, setLastResponse] = useState("");

  async function fire(valid = true) {
    setBusy(true);
    const payload = {
      event: "step.completed",
      creator_id: creatorId,
      step,
      occurred_at: new Date().toISOString(),
      idempotency_key: `ob_${creatorId}_${step}_${Date.now()}`,
    };
    const body = JSON.stringify(payload);
    const signature = valid
      ? await signBody(body)
      : "sha256=deadbeefinvalidsignature";

    try {
      const res = await fetch("/api/webhooks/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Relay-Signature": signature,
        },
        body,
      });
      const json = await res.json();
      setLastResponse(JSON.stringify(json, null, 2));

      const event: WebhookEvent = {
        id: `wh_${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        source: "web_onboarding",
        event: payload.event,
        creatorId,
        step,
        signatureValid: valid && res.ok,
        status: res.ok ? "applied" : "rejected",
        idempotencyKey: payload.idempotency_key,
        raw: body,
      };
      applyWebhookLocally(event);
      pushToast({
        title: res.ok ? "Webhook applied" : "Webhook rejected",
        detail: res.ok ? `${creatorId} · ${step}` : json.error,
        tone: res.ok ? "signal" : "heat",
      });
    } catch (e) {
      pushToast({
        title: "Webhook failed",
        detail: e instanceof Error ? e.message : "network error",
        tone: "heat",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel rounded-2xl p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Live endpoint
          </p>
          <h2 className="display text-2xl">POST /api/webhooks/onboarding</h2>
        </div>
        <Badge tone="signal">HMAC verified</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
          {creators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id})
            </option>
          ))}
        </Select>
        <Select value={step} onChange={(e) => setStep(e.target.value)}>
          <option value="account_created">account_created</option>
          <option value="payment_connected">payment_connected</option>
          <option value="guidelines_accepted">guidelines_accepted</option>
          <option value="first_post_published">first_post_published</option>
          <option value="go_live">go_live</option>
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="ink" disabled={busy} onClick={() => fire(true)}>
          {busy ? "Sending…" : "Send signed webhook"}
        </Button>
        <Button tone="heat" disabled={busy} onClick={() => fire(false)}>
          Send bad signature
        </Button>
      </div>

      {lastResponse && (
        <pre className="mono mt-3 overflow-x-auto rounded-xl bg-ink p-3 text-[11px] text-white/90">
          {lastResponse}
        </pre>
      )}

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Inbox
      </p>
      <ul className="mt-2 space-y-2">
        {webhooks.slice(0, 8).map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-line bg-white/65 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={w.status === "applied" ? "signal" : "heat"}>
                  {w.status}
                </Badge>
                <span className="font-medium">
                  {w.event}
                  {w.step ? ` · ${w.step}` : ""}
                </span>
              </div>
              <span className="mono text-[11px] text-muted">
                {formatRelative(w.at)}
              </span>
            </div>
            <p className="mono mt-1 text-[11px] text-muted">
              {w.creatorId} · {w.idempotencyKey}
            </p>
          </li>
        ))}
      </ul>

      <Field
        className="mt-3"
        readOnly
        value={`Secret: ${WEBHOOK_SECRET} (dev)`}
      />
    </section>
  );
}
