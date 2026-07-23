"use client";

import useSWR, { mutate as globalMutate } from "swr";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useProspects(query = "") {
  return useSWR<{ data: ProspectRow[] }>(`/api/prospects${query}`, fetcher, {
    refreshInterval: 8000,
    keepPreviousData: true,
  });
}

export function useCreators(query = "") {
  return useSWR<{ data: CreatorRow[] }>(`/api/creators${query}`, fetcher, {
    refreshInterval: 8000,
    keepPreviousData: true,
  });
}

export function usePayouts(query = "") {
  return useSWR<{ data: PayoutRow[] }>(`/api/payouts${query}`, fetcher, {
    refreshInterval: 8000,
    keepPreviousData: true,
  });
}

export function useMetrics(days = 30) {
  return useSWR<{ data: MetricsPayload }>(`/api/metrics?days=${days}`, fetcher, {
    refreshInterval: 10000,
    keepPreviousData: true,
  });
}

export function useActivity() {
  return useSWR<{ data: { activity: ActivityRow[]; webhooks: WebhookRow[] } }>(
    "/api/activity",
    fetcher,
    { refreshInterval: 5000, keepPreviousData: true },
  );
}

export function useStats() {
  return useSWR<{ data: StatsPayload }>("/api/stats", fetcher, {
    refreshInterval: 10000,
  });
}

export function useSearch(q: string) {
  const key = q.trim().length ? `/api/search?q=${encodeURIComponent(q.trim())}` : null;
  return useSWR<{ data: { results: SearchHit[] } }>(key, fetcher, {
    keepPreviousData: true,
  });
}

export async function revalidateOps() {
  await Promise.all([
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/")),
  ]);
}

export type SearchHit = {
  type: "prospect" | "creator" | "payout";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type StatsPayload = {
  prospects: number;
  creators: number;
  live: number;
  queuedPayouts: number;
  webhooks: number;
  callBooked: number;
  atRisk: number;
  dbPath: string;
  webhookSecretConfigured: boolean;
};

export type ProspectRow = {
  id: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  niche: string;
  stage: string;
  owner: string;
  lastTouch: string;
  notes: string;
  score: number;
  email: string | null;
  source: string | null;
};

export type CreatorRow = {
  id: string;
  name: string;
  handle: string;
  platform: string;
  stage: string;
  standing: string;
  cpm: number;
  views30d: number;
  installs30d: number;
  webVisits30d: number;
  revenue30d: number;
  postsDue: number;
  postsDone: number;
  nextPayout: number;
  rate: string;
  joinedAt: string;
  manager: string;
  lastPostAt: string | null;
  city: string;
  email: string;
  deepLink: string;
  timezone: string;
};

export type PayoutRow = {
  id: string;
  creatorId: string;
  creatorName: string;
  period: string;
  views: number;
  amount: number;
  status: string;
  updatedAt: string;
};

export type MetricsPayload = {
  rangeDays: number;
  metrics: {
    date: string;
    views: number;
    installs: number;
    webVisits: number;
    revenue: number;
  }[];
  totals: {
    views: number;
    installs: number;
    webVisits: number;
    revenue: number;
  };
  conversion: {
    viewToInstall: number;
    viewToWeb: number;
    revPerInstall: number;
  };
  topCreators: CreatorRow[];
  atRisk: CreatorRow[];
  competitors: {
    name: string;
    shareOfVoice: number;
    weekDelta: number;
    topHook: string;
  }[];
  activity: ActivityRow[];
};

export type ActivityRow = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail: string;
};

export type WebhookRow = {
  id: string;
  at: string;
  source: string;
  event: string;
  creatorId: string;
  step: string | null;
  signatureValid: boolean;
  status: string;
  idempotencyKey: string;
  raw: string;
};
