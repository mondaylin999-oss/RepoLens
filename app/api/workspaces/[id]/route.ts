import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureWorkspaceTables } from "@/lib/account/database";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  if (!authConfigured || !process.env.DATABASE_URL) return json({ ok: false }, 503);
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ ok: false }, 404);
  try {
    const sql = await ensureWorkspaceTables();
    if (!sql) return json({ ok: false }, 503);
    const workspaces = await sql`
      SELECT w.id, w.name, w.owner_user_id AS "ownerUserId", m.role,
        (SELECT COUNT(*)::INTEGER FROM repolens_workspace_members all_members WHERE all_members.workspace_id = w.id) AS "memberCount"
      FROM repolens_workspaces w JOIN repolens_workspace_members m ON m.workspace_id = w.id
      WHERE w.id = ${id}::uuid AND m.user_id = ${session.user.id}
    `;
    if (!workspaces.length) return json({ ok: false }, 404);
    const reviews = await sql`
      SELECT repository, url, score, earned, complete, analyzed_at AS "analyzedAt", created_at AS "sharedAt"
      FROM repolens_workspace_reviews WHERE workspace_id = ${id}::uuid
      ORDER BY analyzed_at DESC LIMIT 100
    `;
    return NextResponse.json({ ok: true, workspace: workspaces[0], reviews }, { headers: noStore() });
  } catch {
    return json({ ok: false, message: "Workspace details couldn't be loaded right now." }, 503);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ ok: false }, 403);
  if (!authConfigured || !process.env.DATABASE_URL) return json({ ok: false }, 503);
  const session = await auth();
  if (!session?.user?.id) return json({ ok: false }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ ok: false }, 404);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!isReview(body)) return json({ ok: false, message: "That review details couldn't be shared." }, 400);
    const sql = await ensureWorkspaceTables();
    if (!sql) return json({ ok: false }, 503);
    const membership = await sql`SELECT 1 FROM repolens_workspace_members WHERE workspace_id = ${id}::uuid AND user_id = ${session.user.id}`;
    if (!membership.length) return json({ ok: false }, 404);
    const reviewId = randomUUID();
    await sql`
      INSERT INTO repolens_workspace_reviews (id, workspace_id, created_by, repository, url, score, earned, complete, analyzed_at)
      VALUES (${reviewId}::uuid, ${id}::uuid, ${session.user.id}, ${body.repository as string}, ${body.url as string},
        ${body.score as number | null}, ${body.earned as number}, ${body.complete as boolean}, ${body.analyzedAt as string}::timestamptz)
      ON CONFLICT (workspace_id, url, analyzed_at) DO NOTHING
    `;
    await sql`
      DELETE FROM repolens_workspace_reviews WHERE id IN (
        SELECT id FROM repolens_workspace_reviews WHERE workspace_id = ${id}::uuid
        ORDER BY analyzed_at DESC OFFSET 100
      )
    `;
    return NextResponse.json({ ok: true }, { headers: noStore() });
  } catch {
    return json({ ok: false, message: "Review couldn't be shared right now." }, 503);
  }
}

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isReview(value: Record<string, unknown>) {
  const repository = value.repository;
  const url = value.url;
  return typeof repository === "string" && /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(repository)
    && typeof url === "string" && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url)
    && url.toLowerCase().replace(/\/$/, "") === `https://github.com/${repository}`.toLowerCase()
    && (value.score === null || (Number.isInteger(value.score) && Number(value.score) >= 0 && Number(value.score) <= 100))
    && Number.isInteger(value.earned) && Number(value.earned) >= 0 && Number(value.earned) <= 100
    && typeof value.complete === "boolean" && typeof value.analyzedAt === "string" && !Number.isNaN(Date.parse(value.analyzedAt));
}
function json(body: object, status: number) { return NextResponse.json(body, { status, headers: noStore() }); }
function noStore(): HeadersInit { return { "Cache-Control": "no-store" }; }
