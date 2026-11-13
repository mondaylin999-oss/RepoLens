import "server-only";
import { neon } from "@neondatabase/serverless";

let workspaceTablesPromise: Promise<void> | undefined;

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

export async function ensureWorkspaceTables() {
  const sql = getAccountDatabase();
  if (!sql) return null;
  if (!workspaceTablesPromise) {
    workspaceTablesPromise = createWorkspaceTables(sql).catch((error) => {
      workspaceTablesPromise = undefined;
      throw error;
    });
  }
  await workspaceTablesPromise;
  return sql;
}

async function createWorkspaceTables(sql: NonNullable<ReturnType<typeof getAccountDatabase>>) {
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_workspaces (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_workspace_members (
      workspace_id UUID NOT NULL REFERENCES repolens_workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (workspace_id, user_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_workspace_invites (
      token_hash TEXT PRIMARY KEY,
      workspace_id UUID NOT NULL REFERENCES repolens_workspaces(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 20,
      use_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS repolens_workspace_reviews (
      id UUID PRIMARY KEY,
      workspace_id UUID NOT NULL REFERENCES repolens_workspaces(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL,
      repository TEXT NOT NULL,
      url TEXT NOT NULL,
      score INTEGER,
      earned INTEGER NOT NULL,
      complete BOOLEAN NOT NULL,
      analyzed_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (workspace_id, url, analyzed_at)
    )
  `;
}
