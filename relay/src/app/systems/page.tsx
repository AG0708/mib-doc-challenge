"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { useActivity, useCreators } from "@/lib/api";
import { WEBHOOK_SECRET } from "@/data/types";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Select,
  Field,
} from "@/components/ui/primitives";

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
  return `sha256=${[...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export default function SystemsPage() {
  const { push } = useToast();
  const { data: creatorsData } = useCreators("");
  const { data: activityData, mutate } = useActivity();
  const creators = creatorsData?.data ?? [];
  const webhooks = activityData?.data.webhooks ?? [];
  const [creatorId, setCreatorId] = useState("c6");
  const [step, setStep] = useState("payment_connected");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState("");

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
      setLast(JSON.stringify(json, null, 2));
      await mutate();
      await globalMutate("/api/creators");
      await globalMutate((k) => typeof k === "string" && k.startsWith("/api/metrics"));
      push({
        title: res.ok ? "Webhook applied to DB" : "Webhook rejected",
        detail: res.ok ? `${creatorId} · ${step}` : json.error,
        tone: res.ok ? "ok" : "bad",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Systems"
        description="Live API + SQLite backend, Supabase-ready schema, and HMAC webhook ingress Sherlock can wire today."
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <section className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Architecture
          </p>
          <h2 className="mt-1 text-lg font-semibold">UI → /api → DB</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>1. Next.js app routes under <span className="mono">/api/*</span></li>
            <li>2. Durable store: SQLite via Drizzle (local) </li>
            <li>3. Same tables in <span className="mono">supabase/migrations/001_init.sql</span></li>
            <li>4. Webhooks verify HMAC, write `webhook_events`, update `creators`</li>
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {[
              "prospects",
              "creators",
              "payouts",
              "daily_metrics",
              "activity",
              "webhook_events",
            ].map((t) => (
              <div key={t} className="rounded-lg border border-line bg-bg px-2.5 py-2">
                <p className="mono font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Live endpoint
              </p>
              <h2 className="text-lg font-semibold">
                POST /api/webhooks/onboarding
              </h2>
            </div>
            <Badge tone="signal">HMAC</Badge>
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
          {last && (
            <pre className="mono mt-3 max-h-48 overflow-auto rounded-lg bg-sidebar p-3 text-[11px] text-white/90">
              {last}
            </pre>
          )}
          <Field className="mt-3" readOnly value={`Dev secret: ${WEBHOOK_SECRET}`} />
        </section>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Webhook inbox (DB)</h2>
        <ul className="space-y-2">
          {webhooks.slice(0, 12).map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge tone={w.status === "applied" ? "signal" : "heat"}>
                  {w.status}
                </Badge>
                <span className="font-medium">
                  {w.event}
                  {w.step ? ` · ${w.step}` : ""}
                </span>
                <span className="mono text-xs text-muted">{w.creatorId}</span>
              </div>
              <span className="mono text-xs text-muted">
                {formatRelative(w.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-4 text-sm text-ink-soft">
        <h2 className="mb-2 font-semibold text-ink">Hand off to Sherlock / Supabase</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Run <span className="mono">supabase/migrations/001_init.sql</span> in your project.</li>
          <li>Point env to Postgres (swap Drizzle SQLite driver for Postgres) or keep SQLite for staging.</li>
          <li>Set <span className="mono">RELAY_WEBHOOK_SECRET</span> and wire web onboarding to this endpoint.</li>
          <li>Replace seed loaders with your RevenueCat / PostHog joins into <span className="mono">daily_metrics</span>.</li>
        </ol>
      </section>
    </div>
  );
}
