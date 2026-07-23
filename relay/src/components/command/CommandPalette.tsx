"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Radar,
  GitBranch,
  Users,
  Wallet,
  Cpu,
  Settings,
  UserRound,
  CheckSquare,
  FileText,
  Clapperboard,
} from "lucide-react";
import { useSearch } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/", label: "Pulse", hint: "Outcomes dashboard", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", hint: "Prospect funnel", icon: Radar },
  { href: "/crm", label: "CRM", hint: "Onboarding pipeline", icon: GitBranch },
  { href: "/roster", label: "Roster", hint: "Live creators", icon: Users },
  { href: "/tasks", label: "Tasks", hint: "Ops to-dos", icon: CheckSquare },
  { href: "/content", label: "Content", hint: "Logged posts", icon: Clapperboard },
  { href: "/templates", label: "Templates", hint: "DM / email copy", icon: FileText },
  { href: "/financials", label: "Financials", hint: "Payroll ledger", icon: Wallet },
  { href: "/systems", label: "Systems", hint: "Webhooks + schema", icon: Cpu },
  { href: "/settings", label: "Settings", hint: "Workspace + reset", icon: Settings },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const { data } = useSearch(q);
  const hits = data?.data.results ?? [];

  const pageHits = PAGES.filter(
    (p) =>
      !q.trim() ||
      p.label.toLowerCase().includes(q.toLowerCase()) ||
      p.hint.toLowerCase().includes(q.toLowerCase()),
  );

  const items = [
    ...pageHits.map((p) => ({
      key: p.href,
      title: p.label,
      subtitle: p.hint,
      href: p.href,
      icon: p.icon,
    })),
    ...hits.map((h) => ({
      key: `${h.type}-${h.id}`,
      title: h.title,
      subtitle: `${h.type} · ${h.subtitle}`,
      href: h.href,
      icon: h.type === "creator" ? UserRound : h.type === "payout" ? Wallet : Radar,
    })),
  ];

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

  useEffect(() => setActive(0), [q, open]);

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
        className="hidden items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-muted hover:bg-bg md:inline-flex"
      >
        <Search size={14} />
        <span>Search</span>
        <kbd className="mono rounded border border-line bg-bg px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/40 px-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-white shadow-2xl"
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
                      setActive((i) => Math.min(items.length - 1, i + 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((i) => Math.max(0, i - 1));
                    }
                    if (e.key === "Enter" && items[active]) go(items[active].href);
                  }}
                  placeholder="Search creators, prospects, pages…"
                  className="w-full bg-transparent py-3.5 text-sm outline-none"
                />
              </div>
              <ul className="max-h-80 overflow-auto p-1.5">
                {items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                          i === active ? "bg-ink text-white" : "hover:bg-bg",
                        )}
                      >
                        <Icon size={16} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              "block truncate text-xs",
                              i === active ? "text-white/70" : "text-muted",
                            )}
                          >
                            {item.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="px-3 py-8 text-center text-sm text-muted">
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
