"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical } from "lucide-react";
import { OUTREACH_STAGES, TEAM } from "@/data/seed";
import type { OutreachStage, Platform, Prospect } from "@/data/types";
import { useOps } from "@/lib/ops-store";
import { formatFollowers, cn } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import {
  PageHeader,
  Badge,
  Avatar,
  Button,
  Field,
  Select,
  PlatformDot,
} from "@/components/ui/primitives";

export default function OutreachPage() {
  const { prospects, moveProspect, updateProspectNotes, addProspect } = useOps();
  const [owner, setOwner] = useState("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(prospects[0]?.id);
  const [dragOver, setDragOver] = useState<OutreachStage | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    handle: "",
    platform: "tiktok" as Platform,
    followers: "100000",
    niche: "",
    owner: "Ava",
    notes: "",
  });

  const selected = prospects.find((p) => p.id === selectedId) ?? prospects[0];

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const matchOwner = owner === "all" || p.owner === owner;
      const query = q.trim().toLowerCase();
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.handle.toLowerCase().includes(query) ||
        p.niche.toLowerCase().includes(query);
      return matchOwner && matchQ;
    });
  }, [prospects, owner, q]);

  function onDrop(stage: OutreachStage, e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/prospect-id");
    if (id) {
      moveProspect(id, stage);
      setSelectedId(id);
    }
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.handle) return;
    addProspect({
      name: form.name,
      handle: form.handle.startsWith("@") ? form.handle : `@${form.handle}`,
      platform: form.platform,
      followers: Number(form.followers) || 0,
      niche: form.niche || "general",
      stage: "sourced",
      owner: form.owner,
      notes: form.notes || "Newly sourced from Loom demo.",
      score: 75,
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
  }

  return (
    <div>
      <PageHeader
        eyebrow="Funnel · Outreach"
        title="Source to booked call."
        description="Drag cards across stages, own the thread, and convert interest into a calendar hold."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Field
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prospects…"
              className="w-44"
            />
            <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="all">Everyone</option>
              {TEAM.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button tone="ink" onClick={() => setShowAdd((v) => !v)}>
              <Plus size={14} />
              Source
            </Button>
          </div>
        }
      />

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={submitAdd}
            className="panel mb-4 overflow-hidden rounded-2xl p-4"
          >
            <p className="mb-3 text-sm font-semibold">Add prospect</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Field
                placeholder="@handle"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                required
              />
              <Field
                placeholder="Niche"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
              />
              <Select
                value={form.platform}
                onChange={(e) =>
                  setForm({ ...form, platform: e.target.value as Platform })
                }
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </Select>
              <Field
                placeholder="Followers"
                value={form.followers}
                onChange={(e) => setForm({ ...form, followers: e.target.value })}
              />
              <Select
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              >
                {TEAM.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-2 flex gap-2">
              <Field
                className="flex-1"
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button type="submit" tone="signal">
                Add to Sourced
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="stage-rail -mx-1 flex gap-3 overflow-x-auto pb-3">
        {OUTREACH_STAGES.map((stage, idx) => {
          const column = filtered.filter((p) => p.stage === stage.id);
          return (
            <motion.section
              key={stage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(stage.id, e)}
              className={cn(
                "panel flex w-[270px] shrink-0 flex-col rounded-2xl p-3 transition",
                dragOver === stage.id && "drag-over",
              )}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-ink">{stage.label}</h2>
                <span className="mono text-xs text-muted">{column.length}</span>
              </div>
              <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {column.map((p) => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      selected={selected?.id === p.id}
                      onSelect={() => setSelectedId(p.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </div>

      {selected && (
        <aside className="panel mt-4 animate-rise rounded-2xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
                    Prospect detail
                  </p>
                  <h3 className="display text-3xl">{selected.name}</h3>
                  <p className="text-sm text-muted">
                    {selected.handle} · {selected.niche} · {selected.owner}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Meta label="Score" value={String(selected.score)} />
                <Meta label="Followers" value={formatFollowers(selected.followers)} />
                <Meta label="Platform" value={<PlatformDot platform={selected.platform} />} />
                <Meta label="Last touch" value={formatRelative(selected.lastTouch)} />
                <Meta label="Source" value={selected.source ?? "—"} />
                <Meta label="Email" value={selected.email ?? "—"} />
              </div>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Notes
              </label>
              <textarea
                value={selected.notes}
                onChange={(e) => updateProspectNotes(selected.id, e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none ring-signal/25 focus:ring-2"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  tone="signal"
                  onClick={() => moveProspect(selected.id, "call_booked")}
                >
                  Book call
                </Button>
                <Button onClick={() => moveProspect(selected.id, "contacted")}>
                  Log nudge
                </Button>
                <Button
                  tone="heat"
                  onClick={() => moveProspect(selected.id, "closed_lost")}
                >
                  Close lost
                </Button>
              </div>
            </div>
            <div className="lg:max-w-xs">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Move stage
              </p>
              <div className="flex flex-wrap gap-2">
                {OUTREACH_STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => moveProspect(selected.id, s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition",
                      selected.stage === s.id
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-white/70 hover:bg-white",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mono mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ProspectCard({
  prospect: p,
  selected,
  onSelect,
}: {
  prospect: Prospect;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/prospect-id", p.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={onSelect}
        className={cn(
          "w-full rounded-xl border px-3 py-3 text-left transition",
          selected
            ? "border-signal/40 bg-white shadow-[0_0_0_3px_rgba(18,196,139,0.14)]"
            : "border-line bg-white/75 hover:bg-white",
        )}
      >
        <div className="flex items-start gap-2">
          <GripVertical size={14} className="mt-1 shrink-0 text-muted/70" />
          <Avatar name={p.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-tight">{p.name}</p>
              <span className="mono text-[11px] text-signal-deep">{p.score}</span>
            </div>
            <p className="mt-0.5 text-sm text-muted">{p.handle}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Badge>
                <PlatformDot platform={p.platform} />
              </Badge>
              <span className="mono text-[11px] text-muted">
                {formatFollowers(p.followers)}
              </span>
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
