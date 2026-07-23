"use client";

import { useMemo, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { CURRENT_USER } from "@/data/types";
import { useLive } from "@/lib/live-store";
import { useOps } from "@/lib/ops-store";
import { formatRelative } from "@/lib/time";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
import { CommandPalette } from "@/components/command/CommandPalette";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { events } = useLive();
  const { webhooks, resetDemoData } = useOps();
  const [openNotifs, setOpenNotifs] = useState(false);
  const [openUser, setOpenUser] = useState(false);

  const items = useMemo(() => {
    const live = events.slice(0, 8).map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      at: new Date(e.at).toISOString(),
    }));
    const wh = webhooks.slice(0, 4).map((w) => ({
      id: w.id,
      title: `${w.event}${w.step ? ` · ${w.step}` : ""}`,
      kind: w.signatureValid ? "crm" : "alert",
      at: w.at,
    }));
    return [...live, ...wh]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 10);
  }, [events, webhooks]);

  const unread = Math.min(events.length, 9);

  return (
    <div className="panel mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-signal/30 bg-signal/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-signal-deep">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
          Production
        </span>
        <span className="hidden text-xs text-muted sm:inline">
          relay · us-east-1
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:block">
          <CommandPalette />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenNotifs((v) => !v);
              setOpenUser(false);
            }}
            className="relative rounded-xl border border-line bg-white/75 p-2 text-ink hover:bg-white"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-heat px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {openNotifs && (
            <div className="panel-strong absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-2xl">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Inbox
              </div>
              <ul className="max-h-80 overflow-auto">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-line/70 px-3 py-2.5 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        tone={
                          item.kind === "alert"
                            ? "heat"
                            : item.kind === "finance"
                              ? "amber"
                              : item.kind === "content"
                                ? "signal"
                                : "neutral"
                        }
                      >
                        {item.kind}
                      </Badge>
                      <span className="mono text-[10px] text-muted">
                        {formatRelative(item.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink">{item.title}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenUser((v) => !v);
              setOpenNotifs(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-white/75 px-2 py-1.5 hover:bg-white"
          >
            <Avatar name={CURRENT_USER.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">
                {CURRENT_USER.name}
              </span>
              <span className="block text-[11px] text-muted">
                {CURRENT_USER.role}
              </span>
            </span>
            <ChevronDown size={14} className="text-muted" />
          </button>
          {openUser && (
            <div className="panel-strong absolute right-0 z-40 mt-2 w-64 rounded-2xl p-3">
              <p className="text-sm font-semibold">{CURRENT_USER.name}</p>
              <p className="text-xs text-muted">{CURRENT_USER.email}</p>
              <p className="mt-1 text-xs text-muted">
                {CURRENT_USER.team} · write access
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    resetDemoData();
                    setOpenUser(false);
                  }}
                >
                  Reset workspace data
                </Button>
                <p className={cn("text-[11px] leading-snug text-muted")}>
                  Changes persist in this browser until reset.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
