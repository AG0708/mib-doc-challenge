"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate as globalMutate } from "swr";
import { useCreators, usePosts } from "@/lib/api";
import { api, formatCompact } from "@/lib/utils";
import { formatRelative } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  Select,
  Empty,
  Stat,
} from "@/components/ui/primitives";

export default function ContentPage() {
  const { push } = useToast();
  const { data, isLoading, mutate } = usePosts();
  const { data: creatorsData } = useCreators("");
  const posts = data?.data ?? [];
  const creators = creatorsData?.data ?? [];

  const [form, setForm] = useState({
    creatorId: "",
    platform: "tiktok",
    caption: "",
    url: "",
    views: "0",
    installs: "0",
  });

  async function logPost(e: React.FormEvent) {
    e.preventDefault();
    if (!form.creatorId || !form.caption.trim()) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        creatorId: form.creatorId,
        platform: form.platform,
        caption: form.caption,
        url: form.url,
        views: Number(form.views) || 0,
        installs: Number(form.installs) || 0,
      }),
    });
    setForm({
      creatorId: form.creatorId,
      platform: "tiktok",
      caption: "",
      url: "",
      views: "0",
      installs: "0",
    });
    await mutate();
    await globalMutate("/api/creators");
    await globalMutate("/api/activity");
    await globalMutate("/api/stats");
    push({ title: "Post logged", detail: "Cadence +1", tone: "ok" });
  }

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalInstalls = posts.reduce((s, p) => s + p.installs, 0);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Content"
        description="Post ledger — logging a post bumps creator cadence."
      />

      <div className="kpi-strip cols-3 mb-2.5">
        <Stat bare label="Logged posts" value={String(posts.length)} />
        <Stat bare label="Views" value={formatCompact(totalViews)} />
        <Stat bare label="Attributed installs" value={formatCompact(totalInstalls)} />
      </div>

      <form onSubmit={logPost} className="card mb-2.5 grid gap-2 p-4 sm:grid-cols-3">
        <Select
          required
          value={form.creatorId}
          onChange={(e) => setForm({ ...form, creatorId: e.target.value })}
        >
          <option value="">Select creator</option>
          {creators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value })}
        >
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="other">Other</option>
        </Select>
        <Field
          placeholder="URL (optional)"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
        <Field
          required
          className="sm:col-span-2"
          placeholder="Caption / hook"
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
        />
        <div className="flex gap-2">
          <Field
            placeholder="Views"
            value={form.views}
            onChange={(e) => setForm({ ...form, views: e.target.value })}
          />
          <Field
            placeholder="Installs"
            value={form.installs}
            onChange={(e) => setForm({ ...form, installs: e.target.value })}
          />
          <Button type="submit" tone="signal">
            Log
          </Button>
        </div>
      </form>

      {isLoading && <Empty label="Loading posts…" />}

      <div className="overflow-hidden rounded-[8px] border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg text-[11px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-2.5 py-1.5 font-semibold">Creator</th>
              <th className="px-2.5 py-1.5 font-semibold">Platform</th>
              <th className="px-2.5 py-1.5 font-semibold">Caption</th>
              <th className="px-2.5 py-1.5 font-semibold">Views</th>
              <th className="px-2.5 py-1.5 font-semibold">Installs</th>
              <th className="px-2.5 py-1.5 font-semibold">Posted</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-2.5 py-1.5">
                  <Link
                    href={`/creators/${p.creatorId}`}
                    className="font-medium hover:text-signal"
                  >
                    {p.creatorName ?? p.creatorId}
                  </Link>
                  <p className="text-xs text-muted">{p.creatorHandle}</p>
                </td>
                <td className="px-2.5 py-1.5">
                  <Badge>{p.platform}</Badge>
                </td>
                <td className="max-w-xs truncate px-2.5 py-1.5">{p.caption}</td>
                <td className="mono px-2.5 py-1.5">{formatCompact(p.views)}</td>
                <td className="mono px-2.5 py-1.5">{formatCompact(p.installs)}</td>
                <td className="px-2.5 py-1.5 text-muted">
                  {formatRelative(p.postedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && posts.length === 0 && (
          <Empty label="No posts logged yet" />
        )}
      </div>
    </div>
  );
}
