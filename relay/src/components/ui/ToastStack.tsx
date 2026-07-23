"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useOps } from "@/lib/ops-store";
import { cn } from "@/lib/utils";

export function ToastStack() {
  const { toasts, dismissToast } = useOps();
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] flex w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "pointer-events-auto panel-strong flex items-start gap-3 rounded-xl px-3.5 py-3 shadow-[0_16px_40px_rgba(13,20,32,0.14)]",
              t.tone === "heat" && "border-heat/30",
              t.tone === "signal" && "border-signal/30",
              t.tone === "amber" && "border-amber/35",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.detail && (
                <p className="mt-0.5 text-xs text-muted">{t.detail}</p>
              )}
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-muted hover:bg-ink/5"
              onClick={() => dismissToast(t.id)}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
