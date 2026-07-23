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
import { useActivity, useMe, useStats } from "@/lib/api";
import { formatRelative } from "@/lib/time";
import { Avatar, Badge } from "@/components/ui/primitives";

type BadgeKey =
  | "callBooked"
  | "creators"
  | "atRisk"
  | "queuedPayouts"
  | "webhooks"
  | "openTasks"
  | "posts"
  | "templates";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: BadgeKey;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Pipeline",
    items: [
      { href: "/", label: "Pulse", icon: LayoutDashboard },
      { href: "/outreach", label: "Outreach", icon: Radar, badge: "callBooked" },
      { href: "/crm", label: "CRM", icon: GitBranch, badge: "creators" },
      { href: "/roster", label: "Roster", icon: Users, badge: "atRisk" },
    ],
  },
  {
    label: "Operations",
    items: [
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
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/systems", label: "Systems", icon: Cpu, badge: "webhooks" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState(false);
  const { data } = useActivity();
  const { data: statsData } = useStats();
  const { data: meData } = useMe();
  const feed = data?.data.activity ?? [];
  const stats = statsData?.data;
  const me = meData?.data;

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[204px] flex-col bg-sidebar text-white lg:static",
            open ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="border-b border-white/10 px-3 py-3">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <span className="grid h-7 w-7 place-items-center rounded bg-signal text-[11px] font-bold">
                R
              </span>
              <div className="min-w-0">
                <p className="display text-[1.05rem] leading-none">Relay</p>
                <p className="mt-0.5 truncate text-[10px] text-sidebar-muted">
                  {me?.workspaceName ?? "Creator ops"} · live
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-1.5 pb-3 pt-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="nav-section">{group.label}</p>
                <div className="flex flex-col gap-px">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const count =
                      item.badge && stats ? stats[item.badge] : null;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px] font-medium transition",
                          active
                            ? "bg-white/10 text-white"
                            : "text-sidebar-muted hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <Icon size={14} strokeWidth={1.75} />
                        <span className="flex-1">{item.label}</span>
                        {typeof count === "number" && count > 0 && (
                          <span className="mono rounded bg-white/10 px-1.5 py-px text-[10px] font-semibold leading-4">
                            {count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-2">
            <div className="flex items-center gap-2 rounded px-1.5 py-1.5">
              <Avatar name={me?.name ?? "Ops"} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium">
                  {me?.name ?? "Ops"}
                </p>
                <p className="truncate text-[10px] text-sidebar-muted">
                  {me?.role ?? "Creator Ops"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-11 items-center gap-2.5 border-b border-line bg-white/95 px-3 backdrop-blur md:px-4">
            <button
              type="button"
              className="rounded border border-line px-2 py-1 lg:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={14} /> : <Menu size={14} />}
            </button>

            <span className="inline-flex items-center gap-1.5 rounded border border-signal/20 bg-signal-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-signal">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
              Live DB
            </span>
            {stats && (
              <span className="hidden text-[11px] text-muted md:inline">
                <span className="mono text-ink">{stats.live}</span> live ·{" "}
                <span className="mono text-ink">{stats.callBooked}</span> calls ·{" "}
                <span className="mono text-ink">{stats.queuedPayouts}</span>{" "}
                payouts ·{" "}
                <span className="mono text-ink">{stats.openTasks}</span> tasks
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <CommandPalette />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setInbox((v) => !v)}
                  className="relative rounded border border-line bg-white p-1.5"
                >
                  <Bell size={14} />
                  {feed.length > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-heat px-1 text-[9px] font-bold text-white">
                      {Math.min(feed.length, 9)}
                    </span>
                  )}
                </button>
                {inbox && (
                  <div className="absolute right-0 mt-1.5 w-[320px] overflow-hidden rounded-[8px] border border-line bg-white shadow-lg">
                    <div className="border-b border-line bg-[#f8fafc] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      Activity
                    </div>
                    <ul className="max-h-80 overflow-auto">
                      {feed.slice(0, 12).map((item) => (
                        <li
                          key={item.id}
                          className="border-b border-line px-2.5 py-2 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge>{item.kind}</Badge>
                            <span className="mono text-[10px] text-muted">
                              {formatRelative(item.at)}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] font-medium leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 px-3 py-3 md:px-4 md:py-3.5">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
