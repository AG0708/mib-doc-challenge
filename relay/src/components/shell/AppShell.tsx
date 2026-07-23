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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Pulse", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", icon: Radar },
  { href: "/crm", label: "CRM", icon: GitBranch },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/financials", label: "Financials", icon: Wallet },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 pb-8 pt-4 md:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:pb-10 lg:pt-6">
      <button
        type="button"
        className="mb-3 flex w-fit items-center gap-2 rounded-md border border-line bg-panel-strong px-3 py-2 text-sm font-medium lg:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
        Menu
      </button>

      <aside
        className={cn(
          "panel grain mb-4 flex w-full shrink-0 flex-col rounded-2xl p-4 lg:mb-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-60 lg:p-5",
          open ? "block" : "hidden lg:block",
        )}
      >
        <Link href="/" className="group mb-8 block" onClick={() => setOpen(false)}>
          <div className="display text-[2rem] leading-none tracking-tight text-ink">
            Relay
          </div>
          <p className="mt-2 text-[13px] leading-snug text-muted">
            Creator command center
          </p>
        </Link>

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
                    : "text-muted hover:bg-white/50 hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-white/80 shadow-[inset_0_0_0_1px_rgba(13,20,32,0.08)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-10 lg:block">
          <div className="rounded-xl border border-line bg-white/55 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
              Live ops
            </div>
            <p className="mt-2 text-sm leading-snug text-ink-soft">
              Views → installs → web visits → revenue. One loop.
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
