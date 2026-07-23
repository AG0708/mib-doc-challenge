"use client";

import { useState } from "react";
import { useStats, revalidateOps } from "@/lib/api";
import { CURRENT_USER, WEBHOOK_SECRET } from "@/data/types";
import { useToast } from "@/components/ui/ToastProvider";
import { PageHeader, Button, Stat, Badge } from "@/components/ui/primitives";

export default function SettingsPage() {
  const { data, mutate } = useStats();
  const stats = data?.data;
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!confirm("Reset local SQLite DB and re-seed demo data?")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/reset", { method: "POST" });
      await revalidateOps();
      await mutate();
      push({ title: "Workspace reset", detail: "Database re-seeded", tone: "ok" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Settings"
        description="Workspace identity, database health, and operator controls."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Prospects" value={String(stats?.prospects ?? "—")} />
        <Stat label="Creators" value={String(stats?.creators ?? "—")} />
        <Stat label="Live roster" value={String(stats?.live ?? "—")} />
        <Stat label="Webhooks logged" value={String(stats?.webhooks ?? "—")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Signed-in operator</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium">{CURRENT_USER.name}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{CURRENT_USER.email}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Role</dt>
              <dd className="font-medium">{CURRENT_USER.role}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Team</dt>
              <dd className="font-medium">{CURRENT_USER.team}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Data plane</h2>
            <Badge tone="signal">SQLite</Badge>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">DB path</dt>
              <dd className="mono text-xs">{stats?.dbPath ?? "data/relay.db"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Webhook secret</dt>
              <dd className="mono text-xs">
                {stats?.webhookSecretConfigured
                  ? "RELAY_WEBHOOK_SECRET set"
                  : `dev · ${WEBHOOK_SECRET}`}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Supabase migration</dt>
              <dd className="mono text-xs">supabase/migrations/001_init.sql</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="heat" disabled={busy} onClick={reset}>
              {busy ? "Resetting…" : "Reset & re-seed DB"}
            </Button>
            <Button onClick={() => revalidateOps()}>Revalidate caches</Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            Reset only affects the local SQLite file. Production should use
            Supabase with the shipped migration.
          </p>
        </section>
      </div>
    </div>
  );
}
