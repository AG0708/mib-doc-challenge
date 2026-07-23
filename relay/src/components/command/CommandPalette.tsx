"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Radar,
  GitBranch,
  Users,
  Wallet,
  Cpu,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Pulse", hint: "Outcomes dashboard", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", hint: "Source → booked call", icon: Radar },
  { href: "/crm", label: "CRM", hint: "Onboarding pipeline", icon: GitBranch },
  { href: "/roster", label: "Roster", hint: "Live creators", icon: Users },
  { href: "/financials", label: "Financials", hint: "Payroll + attribution", icon: Wallet },
  { href: "/systems", label: "Systems", hint: "Model · webhooks · week-one", icon: Cpu },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [...LINKS];
    return LINKS.filter(
      (l) =>
        l.label.toLowerCase().includes(query) ||
        l.hint.toLowerCase().includes(query),
    );
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-line bg-white/70 px-3 py-2 text-sm text-muted transition hover:bg-white lg:inline-flex"
      >
        <Search size={14} />
        <span>Jump</span>
        <kbd className="mono rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] text-ink-soft">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/35 px-4 pt-[12vh] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="panel-strong w-full max-w-lg overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-line px-3">
                <Search size={16} className="text-muted" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((i) => Math.min(results.length - 1, i + 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((i) => Math.max(0, i - 1));
                    }
                    if (e.key === "Enter" && results[active]) {
                      go(results[active].href);
                    }
                  }}
                  placeholder="Jump to Pulse, Outreach, Systems…"
                  className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <ul className="max-h-80 overflow-auto p-2">
                {results.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                          i === active ? "bg-ink text-white" : "hover:bg-ink/5",
                        )}
                      >
                        <Icon size={16} />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "block text-xs",
                              i === active ? "text-white/70" : "text-muted",
                            )}
                          >
                            {item.hint}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted">
                    No matches
                  </li>
                )}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
