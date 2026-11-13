import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureWorkspaceTables } from "@/lib/account/database";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ ok: false }, 403);
  if (!authConfigured || !process.env.DATABASE_URL) return json({ ok: false }, 503);
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ ok: false }, 404);
  try {
    const sql = await ensureWorkspaceTables();
    if (!sql) return json({ ok: false }, 503);
    const owners = await sql`
      SELECT 1 FROM repolens_workspace_members WHERE workspace_id = ${id}::uuid AND user_id = ${session.user.id} AND role = 'owner'
    `;
    if (!owners.length) return json({ ok: false }, 403);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO repolens_workspace_invites (token_hash, workspace_id, created_by, expires_at, max_uses)
      VALUES (${tokenHash}, ${id}::uuid, ${session.user.id}, ${expiresAt}::timestamptz, 20)
    `;
    return NextResponse.json({ ok: true, inviteUrl: `${request.nextUrl.origin}/workspaces/join#token=${token}`, expiresAt }, { headers: noStore() });
  } catch {
    return json({ ok: false, message: "Invite link couldn't be created right now." }, 503);
  }
}

function json(body: object, status: number) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
function noStore(): HeadersInit { return { "Cache-Control": "no-store" }; }
