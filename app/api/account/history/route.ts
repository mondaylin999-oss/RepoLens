import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";
import { ensureAccountHistoryTable } from "@/lib/account/database";

export async function GET() {
  const unavailable = configurationError();
  if (unavailable) return unavailable;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const sql = await ensureAccountHistoryTable();
    if (!sql) return configurationError()!;
    const rows = await sql`
      SELECT repository, url, score, earned, complete, analyzed_at AS "analyzedAt"
      FROM repolens_account_history WHERE user_id = ${session.user.id}
      ORDER BY analyzed_at DESC LIMIT 50
    `;
    return NextResponse.json({ ok: true, name: session.user.name, entries: rows });
  } catch {
    return NextResponse.json({ ok: false, message: "Account history couldn't be loaded right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const unavailable = configurationError();
  if (unavailable) return unavailable;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = await request.json() as { entries?: unknown };
    if (!Array.isArray(body.entries) || body.entries.length > 50 || !body.entries.every(isHistoryEntry)) {
      return NextResponse.json({ ok: false, message: "Those history details couldn't be saved." }, { status: 400 });
    }
    const sql = await ensureAccountHistoryTable();
    if (!sql) return configurationError()!;
    await sql`
      INSERT INTO repolens_account_history (user_id, repository, url, score, earned, complete, analyzed_at)
      SELECT ${session.user.id}, incoming.repository, incoming.url, incoming.score, incoming.earned,
        incoming.complete, incoming.analyzed_at
      FROM jsonb_to_recordset(${JSON.stringify(body.entries)}::jsonb) AS incoming(
        repository TEXT, url TEXT, score INTEGER, earned INTEGER, complete BOOLEAN, analyzed_at TIMESTAMPTZ
      )
      ON CONFLICT (user_id, url, analyzed_at) DO UPDATE SET
        repository = EXCLUDED.repository, score = EXCLUDED.score, earned = EXCLUDED.earned,
        complete = EXCLUDED.complete
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Account history couldn't be saved right now." }, { status: 503 });
  }
}

function configurationError() {
  if (!authConfigured || !process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, configured: false, message: "Cross-device history isn't set up yet." }, { status: 503 });
  }
  return null;
}

function isHistoryEntry(value: unknown): value is {
  repository: string; url: string; score: number | null; earned: number; complete: boolean; analyzedAt: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.repository === "string" && item.repository.length <= 200
    && typeof item.url === "string" && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(item.url)
    && (item.score === null || (Number.isInteger(item.score) && Number(item.score) >= 0 && Number(item.score) <= 100))
    && Number.isInteger(item.earned) && Number(item.earned) >= 0 && Number(item.earned) <= 100
    && typeof item.complete === "boolean" && typeof item.analyzedAt === "string" && !Number.isNaN(Date.parse(item.analyzedAt));
}
