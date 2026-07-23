"use client";

import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { useActivity, useCreators, useHealth } from "@/lib/api";
import { api } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Select,
} from "@/components/ui/primitives";

export default function SystemsPage() {
  const { push } = useToast();
  const { data: creatorsData } = useCreators("");
  const { data: activityData, mutate } = useActivity();
  const { data: healthData, mutate: mutateHealth } = useHealth();
  const creators = creatorsData?.data ?? [];
  const webhooks = activityData?.data.webhooks ?? [];
  const health = healthData?.data;
  const [creatorId, setCreatorId] = useState("");
  const [step, setStep] = useState("payment_connected");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState("");

  useEffect(() => {
    if (!creatorId && creators[0]) setCreatorId(creators[0].id);
  }, [creators, creatorId]);

  async function fire(valid = true) {
    if (!creatorId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/webhooks/onboarding/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_id: creatorId,
          step,
          valid,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      setLast(JSON.stringify(json, null, 2));
      await mutate();
      await mutateHealth();
      await globalMutate("/api/creators");
      await globalMutate("/api/tasks");
      await globalMutate("/api/stats");
      await globalMutate((k) => typeof k === "string" && k.startsWith("/api/metrics"));
      const ok = Boolean(json.ok);
      push({
        title: ok ? "Webhook applied to DB" : "Webhook rejected",
        detail: ok ? `${creatorId} · ${step}` : String(json.error ?? "error"),
        tone: ok ? "ok" : "bad",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "request failed";
      setLast(msg);
      push({ title: "Webhook failed", detail: msg, tone: "bad" });
    } finally {
      setBusy(false);
    }
  }

  async function ingestToday() {
    const date = new Date().toISOString().slice(0, 10);
    await api("/api/metrics", {
      method: "PUT",
      body: JSON.stringify({
        date,
        views: 1250000,
        installs: 4200,
        webVisits: 1800,
        revenue: 9200,
      }),
    });
    await globalMutate((k) => typeof k === "string" && k.startsWith("/api/metrics"));
    await mutateHealth();
    push({ title: "Metrics ingested", detail: date, tone: "ok" });
  }

  const tables = health?.tables ?? {};

  return (
    <div className="animate-rise">
      <PageHeader
        title="Systems"
        description="UI → signed /api → SQLite. Supabase-ready schema + HMAC ingress."
      />

      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-2">
        <section className="card p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Health
              </p>
              <h2 className="text-[13px] font-semibold">Live DB connection</h2>
            </div>
            <Badge tone={health?.connected ? "signal" : "heat"}>
              {health?.connected ? "connected" : "down"}
            </Badge>
          </div>
          <p className="mono text-xs text-muted">
            {health?.driver ?? "…"} · journal {String(health?.journalMode ?? "…")}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {Object.entries(tables).map(([name, count]) => (
              <div key={name} className="rounded-lg border border-line bg-bg px-2.5 py-2">
                <p className="mono font-semibold">{name}</p>
                <p className="mt-0.5 text-muted">{count} rows</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => mutateHealth()}>Refresh health</Button>
            <Button tone="signal" onClick={ingestToday}>
              Ingest today metrics
            </Button>
          </div>
        </section>

        <section className="card p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Live endpoint
              </p>
              <h2 className="text-[13px] font-semibold">
                POST /api/webhooks/onboarding
              </h2>
            </div>
            <Badge tone="signal">HMAC</Badge>
          </div>
          <p className="mb-1.5 text-xs text-muted">
            Browser calls <span className="mono">/simulate</span> — server signs with{" "}
            <span className="mono">RELAY_WEBHOOK_SECRET</span> (secret never leaves the API).
          </p>
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
          <div className="mt-2 flex flex-wrap gap-2">
            <Button tone="ink" disabled={busy || !creatorId} onClick={() => fire(true)}>
              {busy ? "Sending…" : "Send signed webhook"}
            </Button>
            <Button tone="heat" disabled={busy || !creatorId} onClick={() => fire(false)}>
              Send bad signature
            </Button>
          </div>
          {last && (
            <pre className="mono mt-2 max-h-48 overflow-auto rounded-lg bg-sidebar p-3 text-[11px] text-white/90">
              {last}
            </pre>
          )}
        </section>
      </div>

      <section className="card p-2.5">
        <h2 className="mb-1.5 text-sm font-semibold">Webhook inbox (DB)</h2>
        <ul className="space-y-1.5">
          {webhooks.slice(0, 12).map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
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

      <section className="card mt-2.5 p-4 text-sm text-ink-soft">
        <h2 className="mb-2 font-semibold text-ink">Hand off to Sherlock / Supabase</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Run <span className="mono">supabase/migrations/001_init.sql</span> in your project.</li>
          <li>Point env to Postgres (swap Drizzle SQLite driver) or keep SQLite for staging.</li>
          <li>Set <span className="mono">RELAY_WEBHOOK_SECRET</span> and wire web onboarding here.</li>
          <li>Ingest attribution into <span className="mono">PUT /api/metrics</span>.</li>
        </ol>
      </section>
    </div>
  );
}
