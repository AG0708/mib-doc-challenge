export type OutreachStage =
  | "sourced"
  | "contacted"
  | "replied"
  | "call_booked"
  | "no_show"
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
  lastTouch: string;
  notes: string;
  score: number;
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
  joinedAt: string;
  manager: string;
  lastPostAt: string;
  city: string;
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
}
