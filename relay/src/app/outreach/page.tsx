"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { prospects as seedProspects, OUTREACH_STAGES, TEAM } from "@/data/seed";
import type { OutreachStage, Prospect } from "@/data/types";
import { formatFollowers, cn } from "@/lib/utils";
import { PageHeader, Badge } from "@/components/ui/primitives";

export default function OutreachPage() {
  const [items, setItems] = useState<Prospect[]>(seedProspects);
  const [owner, setOwner] = useState<string>("all");
  const [selected, setSelected] = useState<Prospect | null>(seedProspects[0]);

  const filtered = useMemo(
    () => (owner === "all" ? items : items.filter((p) => p.owner === owner)),
    [items, owner],
  );

  function move(id: string, stage: OutreachStage) {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, stage, lastTouch: "2026-07-22", notes: `${p.notes}` }
          : p,
      ),
    );
    setSelected((cur) => (cur?.id === id ? { ...cur, stage } : cur));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Funnel · Outreach"
        title="Source to booked call."
        description="Top of the creator funnel — pull prospects in, work the thread, and convert interest into a calendar hold."
        action={
          <label className="panel-strong flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
            <span className="text-muted">Owner</span>
            <select
              className="bg-transparent font-medium outline-none"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="all">Everyone</option>
              {TEAM.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="stage-rail -mx-1 flex gap-3 overflow-x-auto pb-3">
        {OUTREACH_STAGES.map((stage, idx) => {
          const column = filtered.filter((p) => p.stage === stage.id);
          return (
            <motion.section
              key={stage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="panel flex w-[260px] shrink-0 flex-col rounded-2xl p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-ink">{stage.label}</h2>
                <span className="mono text-xs text-muted">{column.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {column.map((p) => (
                    <motion.button
                      layout
                      key={p.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        selected?.id === p.id
                          ? "border-signal/40 bg-white shadow-[0_0_0_3px_rgba(15,185,129,0.12)]"
                          : "border-line bg-white/70 hover:bg-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{p.name}</p>
                        <span className="mono text-[11px] text-signal-deep">
                          {p.score}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{p.handle}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge>{p.platform}</Badge>
                        <span className="mono text-[11px] text-muted">
                          {formatFollowers(p.followers)}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </div>

      {selected && (
        <aside className="panel mt-4 animate-rise rounded-2xl p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Prospect detail
              </p>
              <h3 className="display mt-1 text-3xl">{selected.name}</h3>
              <p className="mt-1 text-muted">
                {selected.handle} · {selected.niche} · owned by {selected.owner}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {selected.notes}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {OUTREACH_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => move(selected.id, s.id)}
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
        </aside>
      )}
    </div>
  );
}
