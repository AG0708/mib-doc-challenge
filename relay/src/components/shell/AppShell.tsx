"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Radar,
  GitBranch,
  Users,
  Wallet,
  Cpu,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LoomTour } from "@/components/loom/LoomTour";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ToastStack } from "@/components/ui/ToastStack";
import { OpsProvider } from "@/lib/ops-store";

const NAV = [
  { href: "/", label: "Pulse", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", icon: Radar },
  { href: "/crm", label: "CRM", icon: GitBranch },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/financials", label: "Financials", icon: Wallet },
  { href: "/systems", label: "Systems", icon: Cpu },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <OpsProvider>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 pb-28 pt-4 md:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:pb-10 lg:pt-6">
        <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-line bg-panel-strong px-3 py-2 text-sm font-medium"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
            Menu
          </button>
          <CommandPalette />
        </div>

        <aside
          className={cn(
            "panel grain mb-4 flex w-full shrink-0 flex-col rounded-2xl p-4 lg:mb-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[15.5rem] lg:p-5",
            open ? "block" : "hidden lg:flex",
          )}
        >
          <Link
            href="/"
            className="mb-6 block"
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center gap-3">
              <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-ink text-white">
                <span className="display text-lg leading-none">R</span>
                <span className="absolute inset-x-0 bottom-0 h-1 bg-signal" />
              </span>
              <div>
                <div className="display text-[1.85rem] leading-none tracking-tight text-ink">
                  Relay
                </div>
                <p className="mt-1 text-[12px] leading-snug text-muted">
                  Creator command
                </p>
              </div>
            </div>
          </Link>

          <div className="mb-4 hidden lg:block">
            <CommandPalette />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "text-ink"
                      : "text-muted hover:bg-white/55 hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-white shadow-[inset_0_0_0_1px_rgba(11,18,32,0.08)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={16} className="relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-8 lg:block">
            <div className="rounded-xl border border-line bg-gradient-to-br from-white/80 to-signal/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
                Loom-ready
              </div>
              <p className="mt-2 text-sm leading-snug text-ink-soft">
                Process first. End on Systems.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
        <LoomTour />
        <ToastStack />
      </div>
    </OpsProvider>
  );
}
