"use client";

import { use, useState } from "react";
import Link from "next/link";
import { mutate as globalMutate } from "swr";
import { useCreatorDetail, useMe } from "@/lib/api";
import { api, formatCompact, formatUsd } from "@/lib/utils";
import { formatRelative, dateOnly } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  Select,
  Avatar,
  Stat,
  Empty,
} from "@/components/ui/primitives";

export default function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { push } = useToast();
  const { data: meData } = useMe();
  const { data, isLoading, mutate } = useCreatorDetail(id);
  const payload = data?.data;
  const creator = payload?.creator;
  const [note, setNote] = useState("");
  const [postForm, setPostForm] = useState({
    platform: "tiktok",
    caption: "",
    views: "0",
    installs: "0",
  });

  if (isLoading && !creator) {
    return <Empty label="Loading creator…" />;
  }
  if (!creator) {
    return <Empty label="Creator not found" />;
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        entityType: "creator",
        entityId: id,
        body: note,
        author: meData?.data?.name ?? "Ops",
      }),
    });
    setNote("");
    await mutate();
    await globalMutate("/api/activity");
    push({ title: "Note saved", tone: "ok" });
  }

  async function logPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postForm.caption.trim()) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        creatorId: id,
        platform: postForm.platform,
        caption: postForm.caption,
        views: Number(postForm.views) || 0,
        installs: Number(postForm.installs) || 0,
      }),
    });
    setPostForm({
      platform: "tiktok",
      caption: "",
      views: "0",
      installs: "0",
    });
    await mutate();
    await globalMutate("/api/creators");
    await globalMutate("/api/posts");
    await globalMutate("/api/activity");
    push({ title: "Post logged", tone: "ok" });
  }

  async function setStanding(standing: string) {
    await api("/api/creators", {
      method: "PATCH",
      body: JSON.stringify({ id, standing }),
    });
    await mutate();
    await globalMutate("/api/creators");
    await globalMutate("/api/alerts");
    push({ title: "Standing updated", detail: standing, tone: "warn" });
  }

  async function createTask() {
    if (!creator) return;
    const c = creator;
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: `Follow up with ${c.name}`,
        priority: "med",
        assignee: c.manager,
        entityType: "creator",
        entityId: c.id,
        entityLabel: c.name,
      }),
    });
    await mutate();
    await globalMutate("/api/tasks");
    await globalMutate("/api/stats");
    push({ title: "Task created", tone: "ok" });
  }

  const fill = creator.postsDue
    ? Math.min(1, creator.postsDone / creator.postsDue)
    : 0;

  return (
    <div className="animate-rise">
      <PageHeader
        title={creator.name}
        description={`${creator.handle} · ${creator.city} · joined ${dateOnly(creator.joinedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/roster"
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm"
            >
              ← Roster
            </Link>
            <Button tone="signal" onClick={createTask}>
              Create task
            </Button>
          </div>
        }
      />

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Avatar name={creator.name} />
        <Badge>{creator.stage}</Badge>
        <Badge
          tone={
            creator.standing === "at_risk"
              ? "heat"
              : creator.standing === "elite"
                ? "signal"
                : "amber"
          }
        >
          {creator.standing.replace("_", " ")}
        </Badge>
        <span className="text-sm text-muted">
          Manager {creator.manager} · {creator.rate}
        </span>
        <a
          href={creator.deepLink}
          className="mono text-xs text-signal underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          deep link
        </a>
      </div>

      <div className="kpi-strip mb-2.5">
        <Stat bare label="Revenue 30d" value={formatUsd(creator.revenue30d)} />
        <Stat bare label="Views 30d" value={formatCompact(creator.views30d)} />
        <Stat bare label="Installs 30d" value={formatCompact(creator.installs30d)} />
        <Stat
          bare
          label="Cadence"
          value={`${creator.postsDone}/${creator.postsDue}`}
          hint={`${Math.round(fill * 100)}% fulfilled`}
        />
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {(["elite", "strong", "watch", "at_risk"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            tone={creator.standing === s ? "ink" : "ghost"}
            onClick={() => setStanding(s)}
          >
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-2">
        <section className="card p-2.5">
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Notes
          </h2>
          <form onSubmit={addNote} className="mb-2 flex gap-2">
            <Field
              className="flex-1"
              placeholder="Add an ops note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button type="submit" tone="ink">
              Add
            </Button>
          </form>
          <ul className="space-y-1.5">
            {(payload?.notes ?? []).map((n) => (
              <li key={n.id} className="rounded-lg border border-line bg-bg px-3 py-2">
                <div className="flex justify-between gap-2 text-xs text-muted">
                  <span>{n.author}</span>
                  <span className="mono">{formatRelative(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm">{n.body}</p>
              </li>
            ))}
            {(payload?.notes ?? []).length === 0 && (
              <li className="text-sm text-muted">No notes yet</li>
            )}
          </ul>
        </section>

        <section className="card p-2.5">
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Log post
          </h2>
          <form onSubmit={logPost} className="mb-3 grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={postForm.platform}
                onChange={(e) =>
                  setPostForm({ ...postForm, platform: e.target.value })
                }
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </Select>
              <Field
                placeholder="Views"
                value={postForm.views}
                onChange={(e) =>
                  setPostForm({ ...postForm, views: e.target.value })
                }
              />
              <Field
                placeholder="Installs"
                value={postForm.installs}
                onChange={(e) =>
                  setPostForm({ ...postForm, installs: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Field
                className="flex-1"
                required
                placeholder="Caption"
                value={postForm.caption}
                onChange={(e) =>
                  setPostForm({ ...postForm, caption: e.target.value })
                }
              />
              <Button type="submit" tone="signal">
                Log
              </Button>
            </div>
          </form>
          <ul className="space-y-1.5">
            {(payload?.posts ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge>{p.platform}</Badge>
                    <span className="truncate text-sm">{p.caption}</span>
                  </div>
                  <p className="mono mt-1 text-[11px] text-muted">
                    {formatCompact(p.views)} views · {formatCompact(p.installs)}{" "}
                    installs · {formatRelative(p.postedAt)}
                  </p>
                </div>
              </li>
            ))}
            {(payload?.posts ?? []).length === 0 && (
              <li className="text-sm text-muted">No posts logged</li>
            )}
          </ul>
        </section>

        <section className="card p-2.5">
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Tasks
          </h2>
          <ul className="space-y-1.5">
            {(payload?.tasks ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
              >
                <span className={t.status === "done" ? "line-through text-muted" : ""}>
                  {t.title}
                </span>
                <Badge tone={t.status === "done" ? "signal" : "amber"}>
                  {t.status}
                </Badge>
              </li>
            ))}
            {(payload?.tasks ?? []).length === 0 && (
              <li className="text-sm text-muted">No linked tasks</li>
            )}
          </ul>
        </section>

        <section className="card p-2.5">
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Payouts
          </h2>
          <ul className="space-y-1.5">
            {(payload?.payouts ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
              >
                <span>
                  {p.period} · {formatUsd(p.amount)}
                </span>
                <Badge>{p.status}</Badge>
              </li>
            ))}
            {(payload?.payouts ?? []).length === 0 && (
              <li className="text-sm text-muted">No payouts</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
