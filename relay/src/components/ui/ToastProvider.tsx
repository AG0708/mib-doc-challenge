"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type Toast = {
  id: string;
  title: string;
  detail?: string;
  tone?: "ok" | "bad" | "warn";
};

const Ctx = createContext<{
  push: (t: Omit<Toast, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-3 right-3 z-[80] flex w-[280px] flex-col gap-1.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-auto rounded-[6px] border bg-white px-2.5 py-2 shadow-md ${
                t.tone === "bad"
                  ? "border-heat/30"
                  : t.tone === "warn"
                    ? "border-amber/30"
                    : "border-signal/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold">{t.title}</p>
                  {t.detail && (
                    <p className="text-[11px] text-muted">{t.detail}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-muted"
                  onClick={() =>
                    setToasts((prev) => prev.filter((x) => x.id !== t.id))
                  }
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast requires ToastProvider");
  return ctx;
}
