"use client";

import { useState } from "react";
import { useHealth, useMe, useStats, useTeam, revalidateOps } from "@/lib/api";
import { api } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Button,
  Stat,
  Badge,
  Select,
  Field,
} from "@/components/ui/primitives";

export default function SettingsPage() {
  const { data, mutate } = useStats();
  const { data: meData, mutate: mutateMe } = useMe();
  const { data: teamData } = useTeam();
  const { data: healthData } = useHealth();
  const stats = data?.data;
  const me = meData?.data;
  const team = teamData?.data ?? [];
  const health = healthData?.data;
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  async function reset() {
    if (!confirm("Reset local SQLite DB and re-seed demo data?")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/reset", { method: "POST" });
      await revalidateOps();
      await mutate();
      await mutateMe();
      push({ title: "Workspace reset", detail: "Database re-seeded", tone: "ok" });
    } finally {
      setBusy(false);
    }
  }

  async function switchOperator(operatorId: string) {
    await api("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ operatorId }),
    });
    await mutateMe();
    push({ title: "Operator switched", tone: "ok" });
  }

  async function saveWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const name = workspaceName.trim() || me?.workspaceName;
    if (!name) return;
    await api("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ workspaceName: name }),
    });
    await mutateMe();
    setWorkspaceName("");
    push({ title: "Workspace renamed", detail: name, tone: "ok" });
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Settings"
        description="Operator identity and DB health — both loaded from SQLite, not hardcoded chrome."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Prospects" value={String(stats?.prospects ?? "—")} />
        <Stat label="Creators" value={String(stats?.creators ?? "—")} />
        <Stat label="Open tasks" value={String(stats?.openTasks ?? "—")} />
        <Stat label="Webhooks logged" value={String(stats?.webhooks ?? "—")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Signed-in operator</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium">{me?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{me?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line py-2">
              <dt className="text-muted">Role</dt>
              <dd className="font-medium">{me?.role ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Team</dt>
              <dd className="font-medium">{me?.team ?? "—"}</dd>
            </div>
          </dl>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Switch operator
          </label>
          <Select
            className="mt-1 w-full"
            value={me?.id ?? ""}
            onChange={(e) => switchOperator(e.target.value)}
          >
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.role}
              </option>
            ))}
          </Select>
          <form onSubmit={saveWorkspace} className="mt-3 flex gap-2">
            <Field
              className="flex-1"
              placeholder={me?.workspaceName ?? "Workspace name"}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <Button type="submit" tone="ink">
              Rename
            </Button>
          </form>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Data plane</h2>
            <Badge tone={health?.connected ? "signal" : "heat"}>
              {health?.connected ? "SQLite live" : "offline"}
            </Badge>
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
                  : "dev default (server-only)"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Tables</dt>
              <dd className="mono text-xs">
                {health ? Object.keys(health.tables).length : "—"} tracked
              </dd>
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
