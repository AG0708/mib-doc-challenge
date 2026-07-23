"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, X } from "lucide-react";
import { LOOM_BEATS } from "@/data/loom";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "relay-loom-tour";

export function LoomTour() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) setOpen(true);
      else setOpen(stored === "1");
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const match = LOOM_BEATS.findIndex((b) =>
      b.href === "/" ? pathname === "/" : pathname.startsWith(b.href),
    );
    if (match >= 0) setBeatIndex(match);
  }, [pathname]);

  const beat = LOOM_BEATS[beatIndex] ?? LOOM_BEATS[0];
  const progress = useMemo(
    () => ((beatIndex + 1) / LOOM_BEATS.length) * 100,
    [beatIndex],
  );

  function persist(next: boolean) {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => persist(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(13,20,32,0.25)]"
      >
        <Clapperboard size={16} />
        Loom tour
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl md:inset-x-auto md:right-4 md:left-auto md:w-[min(420px,calc(100vw-2rem))]">
      <div className="panel-strong grain overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(13,20,32,0.18)]">
        <div className="h-1 bg-ink/10">
          <div
            className="h-full bg-signal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Loom teleprompter · {beat.minute} · beat {beatIndex + 1}/
                {LOOM_BEATS.length}
              </p>
              <h2 className="display mt-1 text-2xl leading-none text-ink">
                {beat.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Hide Loom tour"
              onClick={() => persist(false)}
              className="rounded-lg border border-line p-1.5 text-muted hover:bg-white"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Say: </span>
            {beat.say}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Do: </span>
            {beat.do}
          </p>
          <p className="mt-2 rounded-lg border border-signal/25 bg-signal/8 px-2.5 py-2 text-[12px] leading-snug text-signal-deep">
            Hire signal — {beat.signal}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={beatIndex === 0}
              onClick={() => setBeatIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <Link
              href={beat.href}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
                pathname === beat.href ||
                  (beat.href !== "/" && pathname.startsWith(beat.href))
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white hover:bg-white",
              )}
            >
              Go · {beat.title}
            </Link>
            <button
              type="button"
              disabled={beatIndex >= LOOM_BEATS.length - 1}
              onClick={() =>
                setBeatIndex((i) => Math.min(LOOM_BEATS.length - 1, i + 1))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
