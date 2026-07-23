"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  creators as seedCreators,
  payouts as seedPayouts,
  prospects as seedProspects,
} from "@/data/seed";
import type {
  Creator,
  CrmStage,
  OutreachStage,
  PayoutRow,
  Prospect,
} from "@/data/types";

export type Toast = {
  id: string;
  title: string;
  detail?: string;
  tone?: "signal" | "heat" | "amber" | "ink";
};

type OpsContextValue = {
  prospects: Prospect[];
  creators: Creator[];
  payouts: PayoutRow[];
  toasts: Toast[];
  moveProspect: (id: string, stage: OutreachStage) => void;
  updateProspectNotes: (id: string, notes: string) => void;
  addProspect: (input: Omit<Prospect, "id" | "lastTouch" | "score"> & { score?: number }) => void;
  setCreatorStage: (id: string, stage: CrmStage) => void;
  setCreatorStanding: (id: string, standing: Creator["standing"]) => void;
  nudgeCreator: (id: string) => void;
  setPayoutStatus: (id: string, status: PayoutRow["status"]) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

const OpsContext = createContext<OpsContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const [prospects, setProspects] = useState(seedProspects);
  const [creators, setCreators] = useState(seedCreators);
  const [payouts, setPayouts] = useState(seedPayouts);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = uid("toast");
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const moveProspect = useCallback(
    (id: string, stage: OutreachStage) => {
      setProspects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, stage, lastTouch: "2026-07-23" } : p,
        ),
      );
      const name = prospects.find((p) => p.id === id)?.name ?? "Prospect";
      pushToast({
        title: `${name} → ${stage.replace("_", " ")}`,
        detail: "Outreach stage updated",
        tone: "signal",
      });
    },
    [prospects, pushToast],
  );

  const updateProspectNotes = useCallback((id: string, notes: string) => {
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, notes } : p)),
    );
  }, []);

  const addProspect = useCallback(
    (input: Omit<Prospect, "id" | "lastTouch" | "score"> & { score?: number }) => {
      const next: Prospect = {
        ...input,
        id: uid("p"),
        lastTouch: "2026-07-23",
        score: input.score ?? 72,
      };
      setProspects((prev) => [next, ...prev]);
      pushToast({
        title: `Sourced ${next.name}`,
        detail: next.handle,
        tone: "ink",
      });
    },
    [pushToast],
  );

  const setCreatorStage = useCallback(
    (id: string, stage: CrmStage) => {
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage } : c)),
      );
      const name = creators.find((c) => c.id === id)?.name ?? "Creator";
      pushToast({
        title: `${name} → ${stage.replace("_", " ")}`,
        detail: "CRM synced (webhook-ready)",
        tone: "signal",
      });
    },
    [creators, pushToast],
  );

  const setCreatorStanding = useCallback(
    (id: string, standing: Creator["standing"]) => {
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, standing } : c)),
      );
      pushToast({
        title: "Standing updated",
        detail: standing.replace("_", " "),
        tone: standing === "at_risk" ? "heat" : "amber",
      });
    },
    [pushToast],
  );

  const nudgeCreator = useCallback(
    (id: string) => {
      const c = creators.find((x) => x.id === id);
      pushToast({
        title: `Nudge sent to ${c?.manager ?? "manager"}`,
        detail: `${c?.name ?? "Creator"} · Slack DM queued`,
        tone: "amber",
      });
    },
    [creators, pushToast],
  );

  const setPayoutStatus = useCallback(
    (id: string, status: PayoutRow["status"]) => {
      setPayouts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
      pushToast({
        title: `Payout ${status}`,
        detail: payouts.find((p) => p.id === id)?.creatorName,
        tone: status === "hold" ? "heat" : status === "paid" ? "signal" : "ink",
      });
    },
    [payouts, pushToast],
  );

  const value = useMemo(
    () => ({
      prospects,
      creators,
      payouts,
      toasts,
      moveProspect,
      updateProspectNotes,
      addProspect,
      setCreatorStage,
      setCreatorStanding,
      nudgeCreator,
      setPayoutStatus,
      pushToast,
      dismissToast,
    }),
    [
      prospects,
      creators,
      payouts,
      toasts,
      moveProspect,
      updateProspectNotes,
      addProspect,
      setCreatorStage,
      setCreatorStanding,
      nudgeCreator,
      setPayoutStatus,
      pushToast,
      dismissToast,
    ],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}
