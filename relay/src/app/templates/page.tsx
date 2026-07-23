"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { useTemplates, type TemplateRow } from "@/lib/api";
import { api } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  Select,
  Empty,
} from "@/components/ui/primitives";

export default function TemplatesPage() {
  const { push } = useToast();
  const { data, isLoading, mutate } = useTemplates();
  const templates = data?.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active =
    templates.find((t) => t.id === activeId) ?? templates[0] ?? null;

  const [form, setForm] = useState({
    name: "",
    channel: "dm",
    body: "",
  });
  const [previewName, setPreviewName] = useState("Mina");
  const [draft, setDraft] = useState("");

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/templates", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ name: "", channel: "dm", body: "" });
    await mutate();
    await globalMutate("/api/stats");
    push({ title: "Template saved", tone: "ok" });
  }

  async function saveActive() {
    if (!active || !draft.trim()) return;
    await api("/api/templates", {
      method: "PATCH",
      body: JSON.stringify({ id: active.id, body: draft }),
    });
    await mutate();
    push({ title: "Template updated", tone: "ok" });
  }

  function renderPreview(tpl: TemplateRow) {
    return tpl.body
      .replaceAll("{{name}}", previewName)
      .replaceAll("{{niche}}", "dating safety")
      .replaceAll("{{done}}", "1")
      .replaceAll("{{due}}", "4")
      .replaceAll("{{standing}}", "watch")
      .replaceAll("{{deepLink}}", "https://sherlock.app/c/demo");
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Templates"
        description="DM / email / Slack copy with merge fields."
      />

      <form onSubmit={createTemplate} className="card mb-2.5 grid gap-2 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field
            required
            placeholder="Template name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
          >
            <option value="dm">DM</option>
            <option value="email">Email</option>
            <option value="slack">Slack</option>
          </Select>
          <Button type="submit" tone="signal">
            Create
          </Button>
        </div>
        <textarea
          required
          rows={3}
          className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-ink/30"
          placeholder="Body — use {{name}}, {{niche}}, {{deepLink}}…"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </form>

      {isLoading && <Empty label="Loading templates…" />}

      <div className="grid gap-2.5 lg:grid-cols-[240px_1fr]">
        <ul className="card divide-y divide-line overflow-hidden">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(t.id);
                  setDraft(t.body);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm ${
                  active?.id === t.id ? "bg-signal-soft" : "hover:bg-bg"
                }`}
              >
                <span className="font-medium">{t.name}</span>
                <Badge>{t.channel}</Badge>
              </button>
            </li>
          ))}
        </ul>

        {active ? (
          <div className="card p-2.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold">{active.name}</h2>
                <p className="text-xs text-muted">
                  Updated {formatRelative(active.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Field
                  className="w-32"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="Preview name"
                />
                <Button tone="ink" onClick={saveActive}>
                  Save
                </Button>
              </div>
            </div>
            <textarea
              rows={6}
              className="mb-3 w-full rounded-lg border border-line px-2.5 py-1.5 font-mono text-sm outline-none focus:border-ink/30"
              value={draft || active.body}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => {
                if (!draft) setDraft(active.body);
              }}
            />
            <div className="rounded-lg border border-line bg-bg p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Preview
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {renderPreview({ ...active, body: draft || active.body })}
              </p>
            </div>
          </div>
        ) : (
          !isLoading && <Empty label="Create a template to get started" />
        )}
      </div>
    </div>
  );
}
