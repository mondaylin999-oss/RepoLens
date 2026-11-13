import "server-only";
import { createHmac } from "node:crypto";
import { getAccountDatabase } from "@/lib/account/database";

export type LimitedEndpoint = "analysis" | "analysis-files";

const WINDOW_MS = 60_000;
const LIMITS: Record<LimitedEndpoint, number> = {
  analysis: 30,
  "analysis-files": 20,
};

type LocalBucket = { count: number; windowStart: number };
const localBuckets = new Map<string, LocalBucket>();
let ensureTablePromise: Promise<void> | undefined;
let lastCleanupHour = "";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAt: string;
}

/** Limits each client across Vercel instances when Neon is available, with a per-instance fallback. */
export async function checkApiRequestLimit(request: Request, endpoint: LimitedEndpoint): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const limit = LIMITS[endpoint];
  const clientKey = hashClientAddress(readClientAddress(request));
  const retryAt = new Date(windowStart + WINDOW_MS).toISOString();
  const sql = getAccountDatabase();

  if (!sql) return checkLocal(clientKey, endpoint, limit, windowStart, retryAt);

  try {
    await ensureRateLimitTable(sql);
    await pruneOldRows(sql, now);
    const rows = await sql`
      INSERT INTO repolens_api_rate_limits (client_key, endpoint, window_start, request_count)
      VALUES (${clientKey}, ${endpoint}, ${new Date(windowStart)}, 1)
      ON CONFLICT (client_key, endpoint, window_start)
      DO UPDATE SET request_count = repolens_api_rate_limits.request_count + 1
      RETURNING request_count AS count
    `;
    const count = Number(rows[0]?.count ?? limit + 1);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), retryAt };
  } catch {
    // Preserve service availability if Neon is temporarily unreachable. This fallback
    // is per runtime instance; the shared limit resumes automatically when Neon returns.
    return checkLocal(clientKey, endpoint, limit, windowStart, retryAt);
  }
}

function readClientAddress(request: Request): string {
  const direct = request.headers.get("x-real-ip")?.trim();
  if (direct) return direct;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  return forwarded?.at(-1) || "unknown";
}

function hashClientAddress(address: string): string {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL || "repolens-local-rate-limit";
  return createHmac("sha256", secret).update(address).digest("hex");
}

function checkLocal(clientKey: string, endpoint: LimitedEndpoint, limit: number, windowStart: number, retryAt: string): RateLimitResult {
  const key = `${endpoint}:${clientKey}`;
  const current = localBuckets.get(key);
  const count = current?.windowStart === windowStart ? current.count + 1 : 1;
  localBuckets.set(key, { count, windowStart });
  if (localBuckets.size > 5_000) {
    for (const [bucketKey, bucket] of localBuckets) {
      if (bucket.windowStart < windowStart) localBuckets.delete(bucketKey);
    }
  }
  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), retryAt };
}

async function ensureRateLimitTable(sql: NonNullable<ReturnType<typeof getAccountDatabase>>) {
  if (!ensureTablePromise) {
    ensureTablePromise = sql`
      CREATE TABLE IF NOT EXISTS repolens_api_rate_limits (
        client_key TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        request_count INTEGER NOT NULL,
        PRIMARY KEY (client_key, endpoint, window_start)
      )
    `.then(() => undefined).catch((error) => {
      ensureTablePromise = undefined;
      throw error;
    });
  }
  await ensureTablePromise;
}

async function pruneOldRows(sql: NonNullable<ReturnType<typeof getAccountDatabase>>, now: number) {
  const hour = new Date(now).toISOString().slice(0, 13);
  if (hour === lastCleanupHour) return;
  lastCleanupHour = hour;
  try {
    await sql`DELETE FROM repolens_api_rate_limits WHERE window_start < ${new Date(now - 48 * 60 * 60 * 1000)}`;
  } catch {
    // Expired counters do not affect request enforcement if cleanup is delayed.
  }
}
