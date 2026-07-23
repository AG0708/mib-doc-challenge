import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { teamMembers, workspaceSettings } from "@/db/schema";

export const runtime = "nodejs";

function getOperator() {
  const db = getDb();
  const setting = db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.key, "operator_id"))
    .get();
  if (setting?.value) {
    const member = db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, setting.value))
      .get();
    if (member) return member;
  }
  return (
    db
      .select()
      .from(teamMembers)
      .all()
      .find((m) => m.isOperator) ?? db.select().from(teamMembers).all()[0]
  );
}

export async function GET() {
  const db = getDb();
  const me = getOperator();
  const workspaceName =
    db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.key, "workspace_name"))
      .get()?.value ?? "Relay";

  if (!me) {
    return NextResponse.json({
      data: {
        id: "tm_ava",
        name: "Ava Chen",
        email: "ava@relay.internal",
        role: "Creator Ops",
        team: "Growth",
        workspaceName,
      },
    });
  }

  return NextResponse.json({
    data: {
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      team: me.team,
      workspaceName,
    },
  });
}

const PatchSchema = z.object({
  operatorId: z.string().optional(),
  workspaceName: z.string().min(1).optional(),
});

export async function PATCH(req: Request) {
  const body = PatchSchema.parse(await req.json());
  const db = getDb();
  const now = new Date().toISOString();

  if (body.operatorId) {
    const member = db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, body.operatorId))
      .get();
    if (!member) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }
    for (const m of db.select().from(teamMembers).all()) {
      db.update(teamMembers)
        .set({ isOperator: m.id === body.operatorId })
        .where(eq(teamMembers.id, m.id))
        .run();
    }
    const existing = db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.key, "operator_id"))
      .get();
    if (existing) {
      db.update(workspaceSettings)
        .set({ value: body.operatorId, updatedAt: now })
        .where(eq(workspaceSettings.key, "operator_id"))
        .run();
    } else {
      db.insert(workspaceSettings)
        .values({ key: "operator_id", value: body.operatorId, updatedAt: now })
        .run();
    }
  }

  if (body.workspaceName) {
    const existing = db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.key, "workspace_name"))
      .get();
    if (existing) {
      db.update(workspaceSettings)
        .set({ value: body.workspaceName, updatedAt: now })
        .where(eq(workspaceSettings.key, "workspace_name"))
        .run();
    } else {
      db.insert(workspaceSettings)
        .values({
          key: "workspace_name",
          value: body.workspaceName,
          updatedAt: now,
        })
        .run();
    }
  }

  return GET();
}
