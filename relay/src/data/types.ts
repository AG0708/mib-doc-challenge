export type OutreachStage =
  | "sourced"
  | "contacted"
  | "replied"
  | "call_booked"
  | "no_show"
  | "closed_won"
  | "closed_lost";

export type CrmStage =
  | "signed"
  | "onboarding"
  | "first_post"
  | "live"
  | "paused"
  | "churned";

export type Platform = "tiktok" | "instagram" | "youtube";

export type Standing = "elite" | "strong" | "watch" | "at_risk";

export interface Prospect {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  followers: number;
  niche: string;
  stage: OutreachStage;
  owner: string;
  lastTouch: string; // ISO
  notes: string;
  score: number;
  email?: string;
  source?: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  stage: CrmStage;
  standing: Standing;
  cpm: number;
  views30d: number;
  installs30d: number;
  webVisits30d: number;
  revenue30d: number;
  postsDue: number;
  postsDone: number;
  nextPayout: number;
  rate: string;
  joinedAt: string; // ISO date
  manager: string;
  lastPostAt: string; // ISO or empty
  city: string;
  email: string;
  deepLink: string;
  timezone: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "outreach" | "crm" | "content" | "finance" | "alert";
  title: string;
  detail: string;
}

export interface DailyMetric {
  date: string;
  views: number;
  installs: number;
  webVisits: number;
  revenue: number;
}

export interface CompetitorPulse {
  name: string;
  shareOfVoice: number;
  weekDelta: number;
  topHook: string;
}

export interface PayoutRow {
  id: string;
  creatorId: string;
  creatorName: string;
  period: string;
  views: number;
  amount: number;
  status: "queued" | "processing" | "paid" | "hold";
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  at: string;
  source: "web_onboarding" | "slack_bot" | "manual";
  event: string;
  creatorId: string;
  step?: string;
  signatureValid: boolean;
  status: "applied" | "rejected" | "duplicate";
  idempotencyKey: string;
  raw: string;
}

export const CURRENT_USER = {
  name: "Ava Chen",
  email: "ava@relay.internal",
  role: "Creator Ops",
  team: "Growth",
} as const;

export const WEBHOOK_SECRET = "relay_dev_secret";
