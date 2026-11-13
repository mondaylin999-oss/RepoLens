"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ACCOUNT_SYNC_ENABLED_KEY, readAnalysisHistory } from "@/lib/analysis/local-history";

interface AccountHistoryEntry {
  repository: string;
  url: string;
  score: number | null;
  earned: number;
  complete: boolean;
  analyzedAt: string;
}

export function AccountHistory() {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [entries, setEntries] = useState<AccountHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/account/history", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; configured?: boolean; name?: string; entries?: AccountHistoryEntry[]; message?: string };
      if (response.status === 503) {
        setConfigured(false);
      } else if (response.status === 401) {
        setConfigured(true);
        setAuthenticated(false);
      } else if (response.ok && body.ok) {
        setConfigured(true);
        setAuthenticated(true);
        setName(body.name ?? "");
        setEntries(Array.isArray(body.entries) ? body.entries : []);
        setMessage("");
      } else {
        setMessage(body.message ?? "Account history couldn't be loaded right now.");
      }
    } catch {
      setConfigured(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(ACCOUNT_SYNC_ENABLED_KEY) === "true");
    } catch {
      // Sync can still be enabled for this visit.
    }
    void refresh();
  }, []);

  async function setSync(checked: boolean) {
    setEnabled(checked);
    setMessage("");
    try {
      window.localStorage.setItem(ACCOUNT_SYNC_ENABLED_KEY, checked ? "true" : "false");
    } catch {
      // The setting remains active for this visit.
    }
    if (!checked) return;
    const localEntries = readAnalysisHistory();
    if (localEntries.length === 0) {
      setMessage("No local history to sync yet. New analyses will be saved to your account.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/account/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: localEntries }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "History couldn't be synced.");
      setMessage("Your recent local history is now synced to this account.");
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "History couldn't be synced right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || configured === false) return null;

  return (
    <section aria-labelledby="account-history-heading" className="mt-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="account-history-heading" className="font-semibold">Use your history across devices</h3>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with GitHub to keep selected analysis history with your account.</p>
        </div>
        {authenticated ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut({ callbackUrl: "/" })}>Sign out{name ? ` · ${name}` : ""}</Button>
        ) : (
          <Button type="button" onClick={() => void signIn("github", { callbackUrl: "/" })}>Sign in with GitHub</Button>
        )}
      </div>
      {authenticated && (
        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} disabled={busy} onChange={(event) => void setSync(event.target.checked)} className="size-4 accent-primary" />
          Sync my analysis history to this account
        </label>
      )}
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      {authenticated && entries.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {entries.slice(0, 10).map((entry, index) => (
            <li key={`${entry.url}-${entry.analyzedAt}-${index}`} className="rounded-lg border px-3 py-2 text-sm">
              <a href={`/analyze?url=${encodeURIComponent(entry.url)}`} className="font-medium text-primary hover:underline">{entry.repository}</a>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.complete ? `${entry.score}/100` : `At least ${entry.earned}/100`} · {new Date(entry.analyzedAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
