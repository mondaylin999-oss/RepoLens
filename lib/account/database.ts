import "server-only";
import { neon } from "@neondatabase/serverless";

export function getAccountDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

export async function ensureAccountHistoryTable() {
  const sql = getAccountDatabase();
  if (!sql) return null;
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_account_history (
      user_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      url TEXT NOT NULL,
      score INTEGER,
      earned INTEGER NOT NULL,
      complete BOOLEAN NOT NULL,
      analyzed_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, url, analyzed_at)
    )
  `;
  return sql;
}

export async function ensureAccountSavedRepositoriesTable() {
  const sql = getAccountDatabase();
  if (!sql) return null;
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_account_saved_repositories (
      user_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      url TEXT NOT NULL,
      language TEXT,
      saved_at TIMESTAMPTZ NOT NULL,
      last_refreshed_at TIMESTAMPTZ,
      score_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      PRIMARY KEY (user_id, url)
    )
  `;
  return sql;
}
