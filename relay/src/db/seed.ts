import type { Db } from "./index";
import {
  activity,
  competitorPulse,
  contentPosts,
  creators,
  dailyMetrics,
  entityNotes,
  messageTemplates,
  payouts,
  prospects,
  tasks,
  teamMembers,
  webhookEvents,
  workspaceSettings,
} from "./schema";
import {
  activity as seedActivity,
  competitorPulse as seedCompetitors,
  creators as seedCreators,
  dailyMetrics as seedMetrics,
  payouts as seedPayouts,
  prospects as seedProspects,
  seedWebhooks,
  TEAM,
} from "@/data/seed";
import { isoDaysAgo, isoHoursAgo } from "@/lib/time";

const now = () => new Date().toISOString();

function seedTeam(db: Db) {
  if (db.select().from(teamMembers).limit(1).all().length > 0) return;
  const ts = now();
  const emails: Record<string, string> = {
    Ava: "ava@relay.internal",
    Marcus: "marcus@relay.internal",
    Noor: "noor@relay.internal",
    Jules: "jules@relay.internal",
  };
  db.insert(teamMembers)
    .values(
      TEAM.map((name) => ({
        id: `tm_${name.toLowerCase()}`,
        name,
        email: emails[name] ?? `${name.toLowerCase()}@relay.internal`,
        role: name === "Ava" ? "Creator Ops Lead" : "Creator Ops",
        team: "Growth",
        isOperator: name === "Ava",
        createdAt: ts,
      })),
    )
    .run();

  if (db.select().from(workspaceSettings).limit(1).all().length === 0) {
    db.insert(workspaceSettings)
      .values([
        { key: "operator_id", value: "tm_ava", updatedAt: ts },
        { key: "workspace_name", value: "Relay", updatedAt: ts },
      ])
      .run();
  }
}

function seedExtras(db: Db) {
  seedTeam(db);
  if (db.select().from(tasks).limit(1).all().length === 0) {
    const ts = now();
    db.insert(tasks)
      .values([
        {
          id: "t1",
          title: "Prep Nora Voss agency rate card",
          status: "open",
          priority: "high",
          dueAt: isoHoursAgo(-20),
          assignee: "Noor",
          entityType: "prospect",
          entityId: "p7",
          entityLabel: "Nora Voss",
          createdAt: ts,
          updatedAt: ts,
        },
        {
          id: "t2",
          title: "Nudge Cass Rivera for missing posts",
          status: "open",
          priority: "high",
          dueAt: isoHoursAgo(-4),
          assignee: "Jules",
          entityType: "creator",
          entityId: "c4",
          entityLabel: "Cass Rivera",
          createdAt: ts,
          updatedAt: ts,
        },
        {
          id: "t3",
          title: "Review Felix Orth onboarding docs",
          status: "open",
          priority: "med",
          dueAt: isoDaysAgo(-1),
          assignee: "Marcus",
          entityType: "creator",
          entityId: "c6",
          entityLabel: "Felix Orth",
          createdAt: ts,
          updatedAt: ts,
        },
        {
          id: "t4",
          title: "Send Mina Okonkwo call brief",
          status: "done",
          priority: "med",
          dueAt: isoDaysAgo(1),
          assignee: "Ava",
          entityType: "prospect",
          entityId: "p1",
          entityLabel: "Mina Okonkwo",
          createdAt: ts,
          updatedAt: ts,
        },
      ])
      .run();
  }

  if (db.select().from(entityNotes).limit(1).all().length === 0) {
    db.insert(entityNotes)
      .values([
        {
          id: "n1",
          entityType: "creator",
          entityId: "c1",
          author: "Ava",
          body: "Best performing hook this month: face-reveal POV with product CTA in first 2s.",
          createdAt: isoHoursAgo(6),
        },
        {
          id: "n2",
          entityType: "creator",
          entityId: "c4",
          author: "Jules",
          body: "Missed 2 posts. Escalating standing to watch. Offer script pack.",
          createdAt: isoHoursAgo(10),
        },
        {
          id: "n3",
          entityType: "prospect",
          entityId: "p7",
          author: "Noor",
          body: "Agency wants exclusivity clause for 60 days. Legal review needed before call.",
          createdAt: isoHoursAgo(2),
        },
      ])
      .run();
  }

  if (db.select().from(contentPosts).limit(1).all().length === 0) {
    const ts = now();
    db.insert(contentPosts)
      .values([
        {
          id: "cp1",
          creatorId: "c7",
          platform: "tiktok",
          url: "https://tiktok.com/@tessavale/video/1",
          caption: "One photo. Full footprint.",
          views: 2100000,
          installs: 3100,
          postedAt: isoHoursAgo(3),
          createdAt: ts,
        },
        {
          id: "cp2",
          creatorId: "c1",
          platform: "tiktok",
          url: "https://tiktok.com/@lilachen/video/2",
          caption: "I reverse-searched my date…",
          views: 980000,
          installs: 1400,
          postedAt: isoHoursAgo(8),
          createdAt: ts,
        },
        {
          id: "cp3",
          creatorId: "c11",
          platform: "tiktok",
          url: "https://tiktok.com/@sukiahn/video/3",
          caption: "Hook B test — privacy myths",
          views: 720000,
          installs: 980,
          postedAt: isoHoursAgo(6),
          createdAt: ts,
        },
        {
          id: "cp4",
          creatorId: "c4",
          platform: "youtube",
          url: "https://youtube.com/watch?v=cass1",
          caption: "App walkthrough longform",
          views: 120000,
          installs: 180,
          postedAt: isoDaysAgo(8),
          createdAt: ts,
        },
      ])
      .run();
  }

  if (db.select().from(messageTemplates).limit(1).all().length === 0) {
    const ts = now();
    db.insert(messageTemplates)
      .values([
        {
          id: "tpl1",
          name: "First outreach DM",
          channel: "dm",
          body: "Hey {{name}} — loved your recent {{niche}} content. We pay creators tied to real installs/web visits on Sherlock. Open to a 15-min call this week?",
          updatedAt: ts,
        },
        {
          id: "tpl2",
          name: "Post-call follow-up",
          channel: "email",
          body: "Thanks for hopping on, {{name}}. Attaching rate card + content guidelines. Reply with your preferred start date and we'll send the web onboarding link.",
          updatedAt: ts,
        },
        {
          id: "tpl3",
          name: "Cadence nudge (Slack)",
          channel: "slack",
          body: ":warning: {{name}} is behind on posts ({{done}}/{{due}}). Standing={{standing}}. Deep link: {{deepLink}}",
          updatedAt: ts,
        },
      ])
      .run();
  }
}

export function seedIfEmpty(db: Db) {
  const row = db.select().from(creators).limit(1).all();
  if (row.length > 0) {
    seedExtras(db);
    return;
  }

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

  seedExtras(db);
}
