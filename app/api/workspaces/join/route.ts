import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureWorkspaceTables } from "@/lib/account/database";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ ok: false }, 403);
  if (!authConfigured || !process.env.DATABASE_URL) return json({ ok: false, configured: false, message: "Team workspaces aren't set up right now." }, 503);
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  try {
    const body = await request.json() as { token?: unknown };
    if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{30,80}$/.test(body.token)) return json({ ok: false, message: "That invite link isn't valid." }, 400);
    const sql = await ensureWorkspaceTables();
    if (!sql) return json({ ok: false }, 503);
    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const existing = await sql`
      SELECT workspace_id AS id FROM repolens_workspace_invites
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() AND use_count < max_uses
    `;
    if (!existing.length) return json({ ok: false, message: "That invite has expired or reached its member limit." }, 404);
    const workspaceId = String(existing[0].id);
    const membership = await sql`SELECT 1 FROM repolens_workspace_members WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${session.user.id}`;
    if (membership.length) return NextResponse.json({ ok: true, workspaceId }, { headers: noStore() });
    const claimed = await sql`
      UPDATE repolens_workspace_invites SET use_count = use_count + 1
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() AND use_count < max_uses
      RETURNING workspace_id AS id
    `;
    if (!claimed.length) return json({ ok: false, message: "That invite has expired or reached its member limit." }, 404);
    await sql`
      INSERT INTO repolens_workspace_members (workspace_id, user_id, role)
      VALUES (${workspaceId}::uuid, ${session.user.id}, 'member')
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    `;
    return NextResponse.json({ ok: true, workspaceId }, { headers: noStore() });
  } catch {
    return json({ ok: false, message: "That invite couldn't be accepted right now." }, 503);
  }
}

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function noStore(): HeadersInit { return { "Cache-Control": "no-store" }; }
