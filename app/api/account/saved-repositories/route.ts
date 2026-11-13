import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureAccountSavedRepositoriesTable } from "@/lib/account/database";
import type { SavedRepository } from "@/lib/analysis/local-history";

export async function GET() {
  const unavailable = configurationError();
  if (unavailable) return unavailable;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401, headers: noStore() });
  try {
    const sql = await ensureAccountSavedRepositoriesTable();
    if (!sql) return configurationError()!;
    const repositories = await sql`
      SELECT repository, url, language, saved_at AS "savedAt",
        last_refreshed_at AS "lastRefreshedAt", score_history AS "scoreHistory"
      FROM repolens_account_saved_repositories WHERE user_id = ${session.user.id}
      ORDER BY saved_at DESC LIMIT 100
    `;
    return NextResponse.json({ ok: true, repositories }, { headers: noStore() });
  } catch {
    return NextResponse.json({ ok: false, message: "Saved repositories couldn't be loaded right now." }, { status: 503, headers: noStore() });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403, headers: noStore() });
  const unavailable = configurationError();
  if (unavailable) return unavailable;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401, headers: noStore() });
  try {
    const body = await request.json() as { repositories?: unknown };
    if (!Array.isArray(body.repositories) || body.repositories.length > 100
      || !body.repositories.every(isSavedRepository)
      || new Set(body.repositories.map((item) => (item as SavedRepository).url)).size !== body.repositories.length) {
      return NextResponse.json({ ok: false, message: "Those saved repositories couldn't be synced." }, { status: 400, headers: noStore() });
    }
    const sql = await ensureAccountSavedRepositoriesTable();
    if (!sql) return configurationError()!;
    const entries = body.repositories.map((item: SavedRepository) => ({
      repository: item.repository,
      url: item.url,
      language: item.language ?? null,
      saved_at: item.savedAt,
      last_refreshed_at: item.lastRefreshedAt ?? null,
      score_history: item.scoreHistory ?? [],
    }));
    await sql`
      INSERT INTO repolens_account_saved_repositories
        (user_id, repository, url, language, saved_at, last_refreshed_at, score_history)
      SELECT ${session.user.id}, incoming.repository, incoming.url, incoming.language,
        incoming.saved_at, incoming.last_refreshed_at, incoming.score_history
      FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) AS incoming(
        repository TEXT, url TEXT, language TEXT, saved_at TIMESTAMPTZ,
        last_refreshed_at TIMESTAMPTZ, score_history JSONB
      )
      ON CONFLICT (user_id, url) DO UPDATE SET
        repository = EXCLUDED.repository, language = EXCLUDED.language,
        saved_at = EXCLUDED.saved_at, last_refreshed_at = EXCLUDED.last_refreshed_at,
        score_history = EXCLUDED.score_history
    `;
    return NextResponse.json({ ok: true }, { headers: noStore() });
  } catch {
    return NextResponse.json({ ok: false, message: "Saved repositories couldn't be synced right now." }, { status: 503, headers: noStore() });
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403, headers: noStore() });
  const unavailable = configurationError();
  if (unavailable) return unavailable;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401, headers: noStore() });
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(body.url)) {
      return NextResponse.json({ ok: false }, { status: 400, headers: noStore() });
    }
    const sql = await ensureAccountSavedRepositoriesTable();
    if (!sql) return configurationError()!;
    await sql`DELETE FROM repolens_account_saved_repositories WHERE user_id = ${session.user.id} AND url = ${body.url}`;
    return NextResponse.json({ ok: true }, { headers: noStore() });
  } catch {
    return NextResponse.json({ ok: false, message: "Saved repository couldn't be removed from this account right now." }, { status: 503, headers: noStore() });
  }
}

function configurationError() {
  if (!authConfigured || !process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, configured: false, message: "Cross-device saved repositories aren't set up yet." }, { status: 503, headers: noStore() });
  }
  return null;
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function isSavedRepository(value: unknown): value is SavedRepository {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const scoreHistory = item.scoreHistory ?? [];
  return typeof item.repository === "string" && /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(item.repository)
    && typeof item.url === "string" && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(item.url)
    && item.url.toLowerCase().replace(/\/$/, "") === `https://github.com/${item.repository}`.toLowerCase()
    && (item.language === undefined || item.language === null || (typeof item.language === "string" && item.language.length <= 100))
    && typeof item.savedAt === "string" && !Number.isNaN(Date.parse(item.savedAt))
    && (item.lastRefreshedAt === undefined || (typeof item.lastRefreshedAt === "string" && !Number.isNaN(Date.parse(item.lastRefreshedAt))))
    && Array.isArray(scoreHistory) && scoreHistory.length <= 12 && scoreHistory.every(isScoreSnapshot);
}

function isScoreSnapshot(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (item.score === null || (Number.isInteger(item.score) && Number(item.score) >= 0 && Number(item.score) <= 100))
    && Number.isInteger(item.earned) && Number(item.earned) >= 0 && Number(item.earned) <= 100
    && typeof item.complete === "boolean" && typeof item.analyzedAt === "string" && !Number.isNaN(Date.parse(item.analyzedAt));
}
