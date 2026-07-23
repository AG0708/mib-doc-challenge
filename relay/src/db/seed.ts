import type { Db } from "./index";
import {
  activity,
  competitorPulse,
  creators,
  dailyMetrics,
  payouts,
  prospects,
  webhookEvents,
} from "./schema";
import {
  activity as seedActivity,
  competitorPulse as seedCompetitors,
  creators as seedCreators,
  dailyMetrics as seedMetrics,
  payouts as seedPayouts,
  prospects as seedProspects,
  seedWebhooks,
} from "@/data/seed";

const now = () => new Date().toISOString();

export function seedIfEmpty(db: Db) {
  const row = db.select().from(creators).limit(1).all();
  if (row.length > 0) return;

  const ts = now();

  db.insert(prospects)
    .values(
      seedProspects.map((p) => ({
        id: p.id,
        name: p.name,
        handle: p.handle,
        platform: p.platform,
        followers: p.followers,
        niche: p.niche,
        stage: p.stage,
        owner: p.owner,
        lastTouch: p.lastTouch,
        notes: p.notes,
        score: p.score,
        email: p.email ?? null,
        source: p.source ?? null,
        createdAt: ts,
        updatedAt: ts,
      })),
    )
    .run();

  db.insert(creators)
    .values(
      seedCreators.map((c) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        platform: c.platform,
        stage: c.stage,
        standing: c.standing,
        cpm: c.cpm,
        views30d: c.views30d,
        installs30d: c.installs30d,
        webVisits30d: c.webVisits30d,
        revenue30d: c.revenue30d,
        postsDue: c.postsDue,
        postsDone: c.postsDone,
        nextPayout: c.nextPayout,
        rate: c.rate,
        joinedAt: c.joinedAt,
        manager: c.manager,
        lastPostAt: c.lastPostAt || null,
        city: c.city,
        email: c.email,
        deepLink: c.deepLink,
        timezone: c.timezone,
        createdAt: ts,
        updatedAt: ts,
      })),
    )
    .run();

  db.insert(payouts)
    .values(
      seedPayouts.map((p) => ({
        id: p.id,
        creatorId: p.creatorId,
        creatorName: p.creatorName,
        period: p.period,
        views: p.views,
        amount: p.amount,
        status: p.status,
        updatedAt: p.updatedAt,
        createdAt: ts,
      })),
    )
    .run();

  db.insert(dailyMetrics)
    .values(
      seedMetrics.map((m) => ({
        date: m.date,
        views: m.views,
        installs: m.installs,
        webVisits: m.webVisits,
        revenue: m.revenue,
      })),
    )
    .run();

  db.insert(activity)
    .values(
      seedActivity.map((a) => ({
        id: a.id,
        at: a.at,
        kind: a.kind,
        title: a.title,
        detail: a.detail,
      })),
    )
    .run();

  db.insert(webhookEvents)
    .values(
      seedWebhooks.map((w) => ({
        id: w.id,
        at: w.at,
        source: w.source,
        event: w.event,
        creatorId: w.creatorId,
        step: w.step ?? null,
        signatureValid: w.signatureValid,
        status: w.status,
        idempotencyKey: w.idempotencyKey,
        raw: w.raw,
      })),
    )
    .run();

  db.insert(competitorPulse)
    .values(
      seedCompetitors.map((c) => ({
        name: c.name,
        shareOfVoice: c.shareOfVoice,
        weekDelta: c.weekDelta,
        topHook: c.topHook,
      })),
    )
    .run();
}
