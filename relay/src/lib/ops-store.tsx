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
import {
  creators as seedCreators,
  payouts as seedPayouts,
  prospects as seedProspects,
  seedWebhooks,
  STEP_TO_STAGE,
} from "@/data/seed";
import type {
  Creator,
  CrmStage,
  OutreachStage,
  PayoutRow,
  Prospect,
  WebhookEvent,
} from "@/data/types";

export type Toast = {
  id: string;
  title: string;
  detail?: string;
  tone?: "signal" | "heat" | "amber" | "ink";
};

type Persisted = {
  prospects: Prospect[];
  creators: Creator[];
  payouts: PayoutRow[];
  webhooks: WebhookEvent[];
};

const STORAGE_KEY = "relay-ops-v2";

type OpsContextValue = {
  hydrated: boolean;
  prospects: Prospect[];
  creators: Creator[];
  payouts: PayoutRow[];
  webhooks: WebhookEvent[];
  toasts: Toast[];
  moveProspect: (id: string, stage: OutreachStage) => void;
  updateProspectNotes: (id: string, notes: string) => void;
  addProspect: (
    input: Omit<Prospect, "id" | "lastTouch" | "score"> & { score?: number },
  ) => void;
  setCreatorStage: (id: string, stage: CrmStage) => void;
  setCreatorStanding: (id: string, standing: Creator["standing"]) => void;
  nudgeCreator: (id: string) => void;
  setPayoutStatus: (id: string, status: PayoutRow["status"]) => void;
  applyWebhookLocally: (event: WebhookEvent) => void;
  recordWebhook: (event: WebhookEvent) => void;
  resetDemoData: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

const OpsContext = createContext<OpsContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [prospects, setProspects] = useState(seedProspects);
  const [creators, setCreators] = useState(seedCreators);
  const [payouts, setPayouts] = useState(seedPayouts);
  const [webhooks, setWebhooks] = useState(seedWebhooks);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const saved = load();
    if (saved?.prospects?.length) {
      setProspects(saved.prospects);
      setCreators(saved.creators);
      setPayouts(saved.payouts);
      setWebhooks(saved.webhooks ?? seedWebhooks);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ prospects, creators, payouts, webhooks }),
      );
    } catch {
      /* ignore quota */
    }
  }, [prospects, creators, payouts, webhooks, hydrated]);

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
      let name = "Prospect";
      setProspects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          name = p.name;
          return { ...p, stage, lastTouch: new Date().toISOString() };
        }),
      );
      pushToast({
        title: `${name} → ${stage.replaceAll("_", " ")}`,
        detail: "Outreach updated",
        tone: "signal",
      });
    },
    [pushToast],
  );

  const updateProspectNotes = useCallback((id: string, notes: string) => {
    setProspects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, notes, lastTouch: new Date().toISOString() }
          : p,
      ),
    );
  }, []);

  const addProspect = useCallback(
    (
      input: Omit<Prospect, "id" | "lastTouch" | "score"> & { score?: number },
    ) => {
      const next: Prospect = {
        ...input,
        id: uid("p"),
        lastTouch: new Date().toISOString(),
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
      let name = "Creator";
      setCreators((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          name = c.name;
          return { ...c, stage };
        }),
      );
      pushToast({
        title: `${name} → ${stage.replaceAll("_", " ")}`,
        detail: "CRM record updated",
        tone: "signal",
      });
    },
    [pushToast],
  );

  const setCreatorStanding = useCallback(
    (id: string, standing: Creator["standing"]) => {
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, standing } : c)),
      );
      pushToast({
        title: "Standing updated",
        detail: standing.replaceAll("_", " "),
        tone: standing === "at_risk" ? "heat" : "amber",
      });
    },
    [pushToast],
  );

  const nudgeCreator = useCallback(
    (id: string) => {
      const c = creators.find((x) => x.id === id);
      pushToast({
        title: `Slack DM → ${c?.manager ?? "manager"}`,
        detail: `${c?.name ?? "Creator"} · #creator-ops`,
        tone: "amber",
      });
    },
    [creators, pushToast],
  );

  const setPayoutStatus = useCallback(
    (id: string, status: PayoutRow["status"]) => {
      let name = "";
      setPayouts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          name = p.creatorName;
          return { ...p, status, updatedAt: new Date().toISOString() };
        }),
      );
      pushToast({
        title: `Payout ${status}`,
        detail: name,
        tone: status === "hold" ? "heat" : status === "paid" ? "signal" : "ink",
      });
    },
    [pushToast],
  );

  const recordWebhook = useCallback((event: WebhookEvent) => {
    setWebhooks((prev) => [event, ...prev].slice(0, 40));
  }, []);

  const applyWebhookLocally = useCallback(
    (event: WebhookEvent) => {
      recordWebhook(event);
      if (!event.signatureValid || event.status !== "applied") return;
      if (event.step && STEP_TO_STAGE[event.step]) {
        setCreatorStage(event.creatorId, STEP_TO_STAGE[event.step]);
      }
    },
    [recordWebhook, setCreatorStage],
  );

  const resetDemoData = useCallback(() => {
    setProspects(seedProspects);
    setCreators(seedCreators);
    setPayouts(seedPayouts);
    setWebhooks(seedWebhooks);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    pushToast({ title: "Workspace reset", detail: "Seed data restored", tone: "ink" });
  }, [pushToast]);

  const value = useMemo(
    () => ({
      hydrated,
      prospects,
      creators,
      payouts,
      webhooks,
      toasts,
      moveProspect,
      updateProspectNotes,
      addProspect,
      setCreatorStage,
      setCreatorStanding,
      nudgeCreator,
      setPayoutStatus,
      applyWebhookLocally,
      recordWebhook,
      resetDemoData,
      pushToast,
      dismissToast,
    }),
    [
      hydrated,
      prospects,
      creators,
      payouts,
      webhooks,
      toasts,
      moveProspect,
      updateProspectNotes,
      addProspect,
      setCreatorStage,
      setCreatorStanding,
      nudgeCreator,
      setPayoutStatus,
      applyWebhookLocally,
      recordWebhook,
      resetDemoData,
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
