"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  GitBranch,
  Users,
  Wallet,
  Cpu,
  Settings,
  Menu,
  X,
  Bell,
  CheckSquare,
  FileText,
  Clapperboard,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useActivity, useStats } from "@/lib/api";
import { formatRelative } from "@/lib/time";
import { Avatar, Badge } from "@/components/ui/primitives";
import { CURRENT_USER } from "@/data/types";

type BadgeKey =
  | "callBooked"
  | "creators"
  | "atRisk"
  | "queuedPayouts"
  | "webhooks"
  | "openTasks"
  | "posts"
  | "templates";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: BadgeKey;
}[] = [
  { href: "/", label: "Pulse", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", icon: Radar, badge: "callBooked" },
  { href: "/crm", label: "CRM", icon: GitBranch, badge: "creators" },
  { href: "/roster", label: "Roster", icon: Users, badge: "atRisk" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: "openTasks" },
  { href: "/content", label: "Content", icon: Clapperboard, badge: "posts" },
  {
    href: "/templates",
    label: "Templates",
    icon: FileText,
    badge: "templates",
  },
  {
    href: "/financials",
    label: "Financials",
    icon: Wallet,
    badge: "queuedPayouts",
  },
  { href: "/systems", label: "Systems", icon: Cpu, badge: "webhooks" },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState(false);
  const { data } = useActivity();
  const { data: statsData } = useStats();
  const feed = data?.data.activity ?? [];
  const stats = statsData?.data;

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-white lg:static",
            open ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="border-b border-white/10 px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              onClick={() => setOpen(false)}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal text-sm font-bold">
                R
              </span>
              <div>
                <p className="display text-xl leading-none">Relay</p>
                <p className="mt-0.5 text-[11px] text-sidebar-muted">
                  Creator ops
                </p>
              </div>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const count = item.badge && stats ? stats[item.badge] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span className="mono rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2">
              <Avatar name={CURRENT_USER.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {CURRENT_USER.name}
                </p>
                <p className="truncate text-[11px] text-sidebar-muted">
                  {CURRENT_USER.role}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur md:px-6">
            <button
              type="button"
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm lg:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-md bg-signal-soft px-2 py-1 text-[11px] font-semibold text-signal">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
              Live DB
            </span>
            {stats && (
              <span className="hidden text-xs text-muted lg:inline">
                {stats.live} live · {stats.callBooked} calls ·{" "}
                {stats.queuedPayouts} payouts queued
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <CommandPalette />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setInbox((v) => !v)}
                  className="relative rounded-lg border border-line bg-white p-2"
                >
                  <Bell size={16} />
                  {feed.length > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-heat px-1 text-[10px] font-bold text-white">
                      {Math.min(feed.length, 9)}
                    </span>
                  )}
                </button>
                {inbox && (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                    <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Activity
                    </div>
                    <ul className="max-h-80 overflow-auto">
                      {feed.slice(0, 12).map((item) => (
                        <li
                          key={item.id}
                          className="border-b border-line px-3 py-2.5 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge>{item.kind}</Badge>
                            <span className="mono text-[10px] text-muted">
                              {formatRelative(item.at)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
