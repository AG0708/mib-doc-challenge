"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LiveEvent = {
  id: string;
  at: number;
  kind: "content" | "outreach" | "crm" | "finance" | "alert";
  title: string;
};

const SCRIPT: Omit<LiveEvent, "id" | "at">[] = [
  { kind: "content", title: "Tessa Vale +840k views in last hour" },
  { kind: "outreach", title: "Amira Sol opened DM · score 90" },
  { kind: "finance", title: "Payout batch #184 cleared $6.7k" },
  { kind: "alert", title: "Cass Rivera missed post window" },
  { kind: "crm", title: "Felix Orth completed payment_connected" },
  { kind: "content", title: "Suki Ahn hook B +41% vs A" },
  { kind: "outreach", title: "Nora Voss call confirmed Thu 4:30" },
  { kind: "finance", title: "Hugo Martins payout held · policy" },
  { kind: "crm", title: "Nia Brooks moved to first_post" },
  { kind: "content", title: "Lila Chen crossed 12.8M / 30d" },
];

type LiveCtx = {
  live: boolean;
  setLive: (v: boolean) => void;
  events: LiveEvent[];
  pulse: number;
};

const Ctx = createContext<LiveCtx | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState(true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pulse, setPulse] = useState(0);
  const [, setCursor] = useState(0);

  const push = useCallback((item: Omit<LiveEvent, "id" | "at">) => {
    setEvents((prev) =>
      [
        {
          ...item,
          id: `lv_${Math.random().toString(36).slice(2, 7)}`,
          at: Date.now(),
        },
        ...prev,
      ].slice(0, 12),
    );
    setPulse((n) => n + 1);
  }, []);

  useEffect(() => {
    // seed a few
    SCRIPT.slice(0, 3).forEach((s, i) => {
      setTimeout(() => push(s), i * 200);
    });
  }, [push]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      setCursor((c) => {
        const next = (c + 1) % SCRIPT.length;
        push(SCRIPT[next]);
        return next;
      });
    }, 4200);
    return () => clearInterval(id);
  }, [live, push]);

  const value = useMemo(
    () => ({ live, setLive, events, pulse }),
    [live, events, pulse],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLive requires LiveProvider");
  return ctx;
}
