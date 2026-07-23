"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mutate as globalMutate } from "swr";
import { useMe, useTasks, useTeam, type TaskRow } from "@/lib/api";
import { api, cn } from "@/lib/utils";
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

const PRIORITY_TONE = {
  high: "heat" as const,
  med: "amber" as const,
  low: "neutral" as const,
};

export default function TasksPage() {
  const { push } = useToast();
  const { data: teamData } = useTeam();
  const { data: meData } = useMe();
  const team = teamData?.data ?? [];
  const [status, setStatus] = useState("open");
  const [assignee, setAssignee] = useState("all");
  const query = `?status=${status}&assignee=${assignee}`;
  const { data, isLoading, mutate } = useTasks(query);
  const tasks = data?.data ?? [];
  const { data: allData } = useTasks("?status=all");
  const all = allData?.data ?? [];

  const [form, setForm] = useState({
    title: "",
    priority: "med",
    assignee: "Ava",
    dueAt: "",
  });

  const overdue = useMemo(
    () =>
      all.filter(
        (t) =>
          t.status === "open" &&
          t.dueAt &&
          Date.parse(t.dueAt) < Date.now(),
      ).length,
    [all],
  );

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        priority: form.priority,
        assignee: form.assignee || meData?.data?.name || "Ava",
        dueAt: form.dueAt || new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    setForm({
      title: "",
      priority: "med",
      assignee: meData?.data?.name ?? "Ava",
      dueAt: "",
    });
    await mutate();
    await globalMutate("/api/activity");
    await globalMutate("/api/stats");
    await globalMutate("/api/alerts");
    push({ title: "Task created", tone: "ok" });
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await api("/api/tasks", {
      method: "PATCH",
      body: JSON.stringify({ id, ...body }),
    });
    await mutate();
    await globalMutate("/api/activity");
    await globalMutate("/api/stats");
    await globalMutate("/api/alerts");
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Tasks"
        description="Ops work queue linked to creators and prospects."
        action={
          <div className="flex gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="done">Done</option>
              <option value="all">All</option>
            </Select>
            <Select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="all">All assignees</option>
              {team.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="kpi-strip cols-3 mb-2.5">
        <Stat
          bare
          label="Open"
          value={String(all.filter((t) => t.status === "open").length)}
        />
        <Stat bare label="Overdue" value={String(overdue)} />
        <Stat
          bare
          label="Done"
          value={String(all.filter((t) => t.status === "done").length)}
        />
      </div>

      <form onSubmit={createTask} className="card mb-2.5 grid gap-2 p-4 sm:grid-cols-4">
        <Field
          required
          className="sm:col-span-2"
          placeholder="New task…"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="high">High</option>
          <option value="med">Med</option>
          <option value="low">Low</option>
        </Select>
        <div className="flex gap-2">
          <Select
            className="flex-1"
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          >
            {team.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
          <Button type="submit" tone="signal">
            Add
          </Button>
        </div>
      </form>

      {isLoading && <Empty label="Loading tasks…" />}

      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <TaskRowItem
            key={t.id}
            task={t}
            onDone={() => patch(t.id, { status: "done" })}
            onReopen={() => patch(t.id, { status: "open" })}
            onPriority={(priority) => patch(t.id, { priority })}
          />
        ))}
      </ul>
      {!isLoading && tasks.length === 0 && <Empty label="No tasks in this filter" />}
    </div>
  );
}

function TaskRowItem({
  task,
  onDone,
  onReopen,
  onPriority,
}: {
  task: TaskRow;
  onDone: () => void;
  onReopen: () => void;
  onPriority: (p: string) => void;
}) {
  const overdue =
    task.status === "open" &&
    task.dueAt &&
    Date.parse(task.dueAt) < Date.now();
  const href =
    task.entityType === "creator" && task.entityId
      ? `/creators/${task.entityId}`
      : task.entityType === "prospect"
        ? "/outreach"
        : null;

  return (
    <li
      className={cn(
        "card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between",
        task.status === "done" && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              PRIORITY_TONE[task.priority as keyof typeof PRIORITY_TONE] ??
              "neutral"
            }
          >
            {task.priority}
          </Badge>
          {overdue && <Badge tone="heat">Overdue</Badge>}
          <p
            className={cn(
              "font-medium",
              task.status === "done" && "line-through",
            )}
          >
            {task.title}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {task.assignee}
          {task.dueAt ? ` · due ${formatRelative(task.dueAt)}` : ""}
          {task.entityLabel ? (
            <>
              {" · "}
              {href ? (
                <Link href={href} className="text-signal underline-offset-2 hover:underline">
                  {task.entityLabel}
                </Link>
              ) : (
                task.entityLabel
              )}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["high", "med", "low"] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            tone={task.priority === p ? "ink" : "ghost"}
            onClick={() => onPriority(p)}
          >
            {p}
          </Button>
        ))}
        {task.status === "open" ? (
          <Button size="sm" tone="signal" onClick={onDone}>
            Done
          </Button>
        ) : (
          <Button size="sm" onClick={onReopen}>
            Reopen
          </Button>
        )}
      </div>
    </li>
  );
}
