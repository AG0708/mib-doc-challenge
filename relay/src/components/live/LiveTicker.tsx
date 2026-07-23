"use client";

import { useLive } from "@/lib/live-store";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

const TONE: Record<string, string> = {
  content: "text-signal-deep",
  outreach: "text-ink",
  crm: "text-ink-soft",
  finance: "text-amber",
  alert: "text-heat",
};

export function LiveTicker() {
  const { live, setLive, events } = useLive();
  const head = events[0];

  return (
    <div className="panel mb-5 flex flex-col gap-2 overflow-hidden rounded-2xl px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={() => setLive(!live)}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]",
          live
            ? "border-signal/40 bg-signal/12 text-signal-deep"
            : "border-line bg-white/70 text-muted",
        )}
      >
        <Radio size={13} className={live ? "live-dot" : ""} />
        {live ? "Live" : "Paused"}
      </button>
      <div className="relative min-h-[1.25rem] flex-1 overflow-hidden">
        {head ? (
          <p
            key={head.id}
            className={cn(
              "animate-rise truncate text-sm font-medium",
              TONE[head.kind] ?? "text-ink",
            )}
          >
            <span className="mono mr-2 text-[10px] uppercase tracking-[0.14em] text-muted">
              {head.kind}
            </span>
            {head.title}
          </p>
        ) : (
          <p className="text-sm text-muted">Waiting for ops signal…</p>
        )}
      </div>
      <span className="mono hidden text-[11px] text-muted sm:inline">
        {events.length} events
      </span>
    </div>
  );
}
