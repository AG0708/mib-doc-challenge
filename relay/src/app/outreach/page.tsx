"use client";

import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import { OUTREACH_STAGES } from "@/data/seed";
import {
  useMe,
  useNotes,
  useProspects,
  useTeam,
  useTemplates,
  type ProspectRow,
} from "@/lib/api";
import { api, cn, formatFollowers } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  Select,
  Avatar,
  Empty,
} from "@/components/ui/primitives";
import { useRouter } from "next/navigation";

const SAMPLE_CSV = `name,handle,platform,followers,niche,owner,score
Jade Park,@jadepark,tiktok,420000,true crime,Ava,81
Rio Mendes,@riomendes,instagram,210000,dating,Jules,74`;

export default function OutreachPage() {
  const { push } = useToast();
  const router = useRouter();
  const { data: meData } = useMe();
  const { data: teamData } = useTeam();
  const team = teamData?.data ?? [];
  const [owner, setOwner] = useState("all");
  const [q, setQ] = useState("");
  const query = `?owner=${owner}&q=${encodeURIComponent(q)}`;
  const { data, isLoading, mutate } = useProspects(query);
  const items = data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    items.find((p) => p.id === selectedId) ?? items[0] ?? null;
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [bulkStage, setBulkStage] = useState("contacted");
  const [form, setForm] = useState({
    name: "",
    handle: "",
    platform: "tiktok",
    followers: "100000",
    niche: "",
    owner: "Ava",
    notes: "",
  });

  const { data: templatesData } = useTemplates();
  const templates = templatesData?.data ?? [];
  const notesQuery =
    selected?.id
      ? `?entityType=prospect&entityId=${selected.id}`
      : "";
  const { data: notesData, mutate: mutateNotes } = useNotes(notesQuery);
  const notes = notesData?.data ?? [];
  const [noteBody, setNoteBody] = useState("");
  const [compose, setCompose] = useState("");

  const byStage = useMemo(() => {
    const map: Record<string, ProspectRow[]> = {};
    for (const s of OUTREACH_STAGES) map[s.id] = [];
    for (const p of items) {
      if (!map[p.stage]) map[p.stage] = [];
      map[p.stage].push(p);
    }
    return map;
  }, [items]);

  const selectedIds = Object.entries(checked)
    .filter(([, v]) => v)
    .map(([id]) => id);

  async function patch(id: string, body: Record<string, unknown>) {
    await api("/api/prospects", {
      method: "PATCH",
      body: JSON.stringify({ id, ...body }),
    });
    await mutate();
    await globalMutate("/api/activity");
    await globalMutate((k) => typeof k === "string" && k.startsWith("/api/metrics"));
    await globalMutate("/api/alerts");
  }

  async function move(id: string, stage: string) {
    await patch(id, { stage });
    setSelectedId(id);
    push({ title: "Prospect updated", detail: stage.replaceAll("_", " "), tone: "ok" });
  }

  async function onDrop(stage: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/prospect-id");
    if (id) await move(id, stage);
  }

  async function createProspect(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/prospects", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        followers: Number(form.followers) || 0,
      }),
    });
    setShowAdd(false);
    setForm({
      name: "",
      handle: "",
      platform: "tiktok",
      followers: "100000",
      niche: "",
      owner: "Ava",
      notes: "",
    });
    await mutate();
    push({ title: "Prospect sourced", tone: "ok" });
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    const res = await api<{ data: { imported: number } }>("/api/prospects/import", {
      method: "POST",
      body: JSON.stringify({ csv }),
    });
    setShowImport(false);
    await mutate();
    await globalMutate("/api/activity");
    await globalMutate("/api/stats");
    push({
      title: "Import complete",
      detail: `${res.data.imported} prospects sourced`,
      tone: "ok",
    });
  }

  async function bulkMove() {
    if (!selectedIds.length) return;
    await api("/api/prospects/bulk", {
      method: "PATCH",
      body: JSON.stringify({ ids: selectedIds, stage: bulkStage }),
    });
    setChecked({});
    await mutate();
    await globalMutate("/api/activity");
    await globalMutate("/api/alerts");
    push({
      title: "Bulk update",
      detail: `${selectedIds.length} → ${bulkStage.replaceAll("_", " ")}`,
      tone: "ok",
    });
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !noteBody.trim()) return;
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        entityType: "prospect",
        entityId: selected.id,
        body: noteBody,
        author: meData?.data?.name ?? "Ops",
      }),
    });
    setNoteBody("");
    await mutateNotes();
    await globalMutate("/api/activity");
    push({ title: "Note added", tone: "ok" });
  }

  async function convertSelected() {
    if (!selected) return;
    const res = await api<{ data: { creator: { id: string; name: string } } }>(
      `/api/prospects/${selected.id}/convert`,
      {
        method: "POST",
        body: JSON.stringify({ manager: selected.owner }),
      },
    );
    await mutate();
    await globalMutate("/api/creators");
    await globalMutate("/api/tasks");
    await globalMutate("/api/stats");
    await globalMutate("/api/activity");
    push({
      title: "Converted to creator",
      detail: res.data.creator.name,
      tone: "ok",
    });
    router.push(`/creators/${res.data.creator.id}`);
  }

  function applyTemplate(id: string) {
    if (!selected) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const text = tpl.body
      .replaceAll("{{name}}", selected.name.split(" ")[0] ?? selected.name)
      .replaceAll("{{niche}}", selected.niche || "your niche")
      .replaceAll("{{done}}", "0")
      .replaceAll("{{due}}", "0")
      .replaceAll("{{standing}}", "n/a")
      .replaceAll("{{deepLink}}", "https://sherlock.app/c/preview");
    setCompose(text);
    push({ title: "Template applied", detail: tpl.name, tone: "ok" });
  }

  async function logOutreach() {
    if (!selected || !compose.trim()) return;
    await patch(selected.id, {
      stage: selected.stage === "sourced" ? "contacted" : selected.stage,
      notes: `${selected.notes}\n\n[Outreach] ${compose}`.trim(),
    });
    setCompose("");
    push({ title: "Outreach logged", detail: "Stage + notes updated", tone: "ok" });
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Outreach"
        description="Source → booked call. Drag cards, bulk-move, import CSV, or fire a template — every change writes to the database."
        action={
          <div className="flex flex-wrap gap-2">
            <Field
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-40"
            />
            <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="all">All owners</option>
              {team.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setShowImport((v) => !v)}>Import</Button>
            <Button tone="ink" onClick={() => setShowAdd((v) => !v)}>
              Source
            </Button>
          </div>
        }
      />

      {selectedIds.length > 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
          >
            {OUTREACH_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button tone="signal" onClick={bulkMove}>
            Bulk move
          </Button>
          <Button onClick={() => setChecked({})}>Clear</Button>
        </div>
      )}

      {showImport && (
        <form onSubmit={importCsv} className="card mb-4 space-y-2 p-4">
          <p className="text-sm text-muted">
            CSV headers: name, handle, platform, followers, niche, owner, score
          </p>
          <textarea
            rows={6}
            className="w-full rounded-lg border border-line px-3 py-2 font-mono text-xs outline-none focus:border-ink/30"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" tone="signal">
              Import to sourced
            </Button>
            <Button type="button" onClick={() => setCsv(SAMPLE_CSV)}>
              Reset sample
            </Button>
          </div>
        </form>
      )}

      {showAdd && (
        <form onSubmit={createProspect} className="card mb-4 grid gap-2 p-4 sm:grid-cols-3">
          <Field
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            required
            placeholder="@handle"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value })}
          />
          <Field
            placeholder="Niche"
            value={form.niche}
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
          />
          <Select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
          >
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </Select>
          <Field
            value={form.followers}
            onChange={(e) => setForm({ ...form, followers: e.target.value })}
          />
          <Select
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
          >
            {team.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-3 flex gap-2">
            <Field
              className="flex-1"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button type="submit" tone="signal">
              Add
            </Button>
          </div>
        </form>
      )}

      {isLoading && <Empty label="Loading prospects from DB…" />}

      <div className="stage-rail -mx-1 flex gap-3 overflow-x-auto pb-2">
        {OUTREACH_STAGES.map((stage) => (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(stage.id, e)}
            className={cn(
              "card flex w-[250px] shrink-0 flex-col p-2.5",
              dragOver === stage.id && "ring-2 ring-signal/40",
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {stage.label}
              </h2>
              <span className="mono text-xs text-muted">
                {(byStage[stage.id] ?? []).length}
              </span>
            </div>
            <div className="flex min-h-[100px] flex-col gap-2">
              {(byStage[stage.id] ?? []).map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/prospect-id", p.id)
                  }
                  className={cn(
                    "rounded-lg border px-2.5 py-2.5 text-left transition",
                    selected?.id === p.id
                      ? "border-signal bg-signal-soft"
                      : "border-line bg-white hover:bg-bg",
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[p.id])}
                      onChange={(e) =>
                        setChecked((prev) => ({
                          ...prev,
                          [p.id]: e.target.checked,
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Avatar name={p.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {p.name}
                            </p>
                            <span className="mono text-[11px] text-signal">
                              {p.score}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted">
                            {p.handle}
                          </p>
                          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                            <Badge>{p.platform}</Badge>
                            <span className="mono">
                              {formatFollowers(p.followers)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selected && (
        <aside className="card mt-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} />
                <div>
                  <h3 className="text-xl font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted">
                    {selected.handle} · {selected.niche} · {selected.owner}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Meta label="Score" value={String(selected.score)} />
                <Meta
                  label="Followers"
                  value={formatFollowers(selected.followers)}
                />
                <Meta
                  label="Last touch"
                  value={formatRelative(selected.lastTouch)}
                />
                <Meta label="Source" value={selected.source ?? "—"} />
              </div>
              <textarea
                className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink/30"
                rows={3}
                value={selected.notes}
                onChange={async (e) => {
                  const notes = e.target.value;
                  setSelectedId(selected.id);
                  await patch(selected.id, { notes });
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button tone="signal" onClick={() => move(selected.id, "call_booked")}>
                  Book call
                </Button>
                <Button onClick={() => move(selected.id, "contacted")}>
                  Log nudge
                </Button>
                {selected.stage !== "closed_won" && (
                  <Button tone="ink" onClick={convertSelected}>
                    Convert → CRM
                  </Button>
                )}
                <Button tone="heat" onClick={() => move(selected.id, "closed_lost")}>
                  Close lost
                </Button>
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Compose from template
                </p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      onClick={() => applyTemplate(t.id)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink/30"
                  rows={3}
                  placeholder="Message draft…"
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                />
                <div className="mt-2">
                  <Button tone="ink" onClick={logOutreach} disabled={!compose.trim()}>
                    Log outreach
                  </Button>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Thread notes
                </p>
                <form onSubmit={addNote} className="mb-2 flex gap-2">
                  <Field
                    className="flex-1"
                    placeholder="Add note…"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                  />
                  <Button type="submit" tone="signal">
                    Add
                  </Button>
                </form>
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between text-xs text-muted">
                        <span>{n.author}</span>
                        <span className="mono">{formatRelative(n.createdAt)}</span>
                      </div>
                      <p className="mt-1">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap content-start gap-1.5 lg:max-w-xs">
              {OUTREACH_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => move(selected.id, s.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]",
                    selected.stage === s.id
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg px-2.5 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mono mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
