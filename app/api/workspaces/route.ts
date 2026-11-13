import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureWorkspaceTables } from "@/lib/account/database";

export async function GET() {
  if (!authConfigured || !process.env.DATABASE_URL) return unavailable();
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  try {
    const sql = await ensureWorkspaceTables();
    if (!sql) return unavailable();
    const workspaces = await sql`
      SELECT w.id, w.name, w.owner_user_id AS "ownerUserId", m.role,
        (SELECT COUNT(*)::INTEGER FROM repolens_workspace_members all_members WHERE all_members.workspace_id = w.id) AS "memberCount"
      FROM repolens_workspaces w
      JOIN repolens_workspace_members m ON m.workspace_id = w.id
      WHERE m.user_id = ${session.user.id}
      ORDER BY w.created_at DESC
    `;
    return NextResponse.json({ ok: true, workspaces }, { headers: noStore() });
  } catch {
    return json({ ok: false, message: "Workspaces couldn't be loaded right now." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ ok: false }, 403);
  if (!authConfigured || !process.env.DATABASE_URL) return unavailable();
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  try {
    const body = await request.json() as { name?: unknown };
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 60) {
      return json({ ok: false, message: "Choose a workspace name between 2 and 60 characters." }, 400);
    }
    const sql = await ensureWorkspaceTables();
    if (!sql) return unavailable();
    const id = randomUUID();
    await sql`
      WITH created AS (
        INSERT INTO repolens_workspaces (id, name, owner_user_id)
        VALUES (${id}::uuid, ${body.name.trim()}, ${session.user.id}) RETURNING id
      )
      INSERT INTO repolens_workspace_members (workspace_id, user_id, role)
      SELECT id, ${session.user.id}, 'owner' FROM created
    `;
    return NextResponse.json({ ok: true, workspace: { id, name: body.name.trim(), role: "owner", memberCount: 1 } }, { status: 201, headers: noStore() });
  } catch {
    return json({ ok: false, message: "Workspace couldn't be created right now." }, 503);
  }
}

function unavailable() {
  return json({ ok: false, configured: false, message: "Team workspaces aren't set up right now." }, 503);
}

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: noStore() });
}

function noStore(): HeadersInit { return { "Cache-Control": "no-store" }; }
