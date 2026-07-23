"use client";

import { motion } from "framer-motion";

export function ConversionRibbon({
  rates,
  steps,
}: {
  rates: { viewToInstall: number; viewToWeb: number; revPerInstall: number };
  steps: { key: string; label: string; value: string; color: string }[];
}) {
  const STEPS = steps;
  return (
    <div className="panel grain mb-5 overflow-hidden rounded-2xl p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Attribution chain
          </p>
          <h2 className="display mt-1 text-2xl md:text-3xl">
            Views → money, without hand-waving.
          </h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-lg border border-line bg-white/70 px-2.5 py-1.5">
            View→install{" "}
            <strong className="mono">{rates.viewToInstall.toFixed(2)}%</strong>
          </span>
          <span className="rounded-lg border border-line bg-white/70 px-2.5 py-1.5">
            View→web{" "}
            <strong className="mono">{rates.viewToWeb.toFixed(2)}%</strong>
          </span>
          <span className="rounded-lg border border-line bg-white/70 px-2.5 py-1.5">
            $/install{" "}
            <strong className="mono">
              ${rates.revPerInstall.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 260, damping: 22 }}
            className="relative rounded-xl border border-line bg-white/75 p-3"
          >
            <div
              className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/8"
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: step.color }}
                initial={{ width: 0 }}
                animate={{ width: `${100 - i * 18}%` }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.7 }}
              />
            </div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {step.label}
            </p>
            <p className="mono mt-1 text-2xl font-semibold tracking-tight">
              {step.value}
            </p>
            {i < STEPS.length - 1 && (
              <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-muted sm:block">
                →
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
