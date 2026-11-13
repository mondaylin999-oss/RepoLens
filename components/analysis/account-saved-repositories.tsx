"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ACCOUNT_SAVED_REPOSITORIES_SYNC_KEY,
  notifySavedRepositoriesChanged,
  readSavedRepositories,
  SAVED_REPOSITORIES_CHANGE_EVENT,
  SAVED_REPOSITORIES_KEY,
  type SavedRepository,
} from "@/lib/analysis/local-history";
import { useLanguage } from "@/components/layout/language-provider";

export function AccountSavedRepositories() {
  const pathname = usePathname();
  const { text: t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  async function loadAccountRepositories() {
    try {
      const response = await fetch("/api/account/saved-repositories", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; configured?: boolean; repositories?: SavedRepository[] };
      if (response.status === 503) return;
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok || !body.ok || !Array.isArray(body.repositories)) return;
      setAuthenticated(true);
      const remote = body.repositories;
      setCount(remote.length);
      if (window.localStorage.getItem(ACCOUNT_SAVED_REPOSITORIES_SYNC_KEY) === "true") {
        const merged = mergeRepositories(readSavedRepositories(), remote);
        window.localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify(merged));
        notifySavedRepositoriesChanged("upsert");
        await saveAccountRepositories(merged);
      }
    } catch {
      // Local saved repositories remain available when account storage is unavailable.
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser-only preference after hydration to keep server and client markup aligned.
      setEnabled(window.localStorage.getItem(ACCOUNT_SAVED_REPOSITORIES_SYNC_KEY) === "true");
    } catch {
      // Sync can still be enabled for this visit.
    }
    void loadAccountRepositories();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated || !enabled) return;
    const onSavedChange = async (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; url?: string }>).detail;
      if (detail?.action === "remove" && detail.url) {
        try {
          const response = await fetch("/api/account/saved-repositories", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: detail.url }),
          });
          if (!response.ok) setMessage("That repository was removed here, but couldn't be removed from your account yet.");
          else setCount((current) => Math.max(0, current - 1));
        } catch {
          setMessage("That repository was removed here, but couldn't be removed from your account yet.");
        }
        return;
      }
      if (!detail?.url) return;
      const item = readSavedRepositories().find((repository) => repository.url === detail.url);
      if (!item) return;
      try {
        await saveAccountRepositories([item]);
        setCount(readSavedRepositories().length);
        setMessage("");
      } catch {
        setMessage("Saved on this device, but couldn't sync to your account yet.");
      }
    };
    window.addEventListener(SAVED_REPOSITORIES_CHANGE_EVENT, onSavedChange);
    return () => window.removeEventListener(SAVED_REPOSITORIES_CHANGE_EVENT, onSavedChange);
  }, [ready, authenticated, enabled]);

  async function setSync(checked: boolean) {
    setEnabled(checked);
    setMessage("");
    try {
      window.localStorage.setItem(ACCOUNT_SAVED_REPOSITORIES_SYNC_KEY, checked ? "true" : "false");
    } catch {
      // Keep the setting active for this page visit.
    }
    if (!checked) return;
    setBusy(true);
    try {
      const response = await fetch("/api/account/saved-repositories", { cache: "no-store" });
      const body = await response.json() as { repositories?: SavedRepository[]; message?: string };
      if (!response.ok || !Array.isArray(body.repositories)) throw new Error(body.message ?? "Saved repositories couldn't be loaded.");
      const merged = mergeRepositories(readSavedRepositories(), body.repositories);
      await saveAccountRepositories(merged);
      window.localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify(merged));
      setCount(merged.length);
      setMessage("Saved repositories are synced with this account.");
      notifySavedRepositoriesChanged("upsert");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Saved repositories couldn't be synced right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !authenticated || pathname !== "/") return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section aria-labelledby="account-saved-repositories-heading" className="mt-4 rounded-xl border bg-card p-4">
        <h3 id="account-saved-repositories-heading" className="font-semibold">{t("Keep saved repositories across devices")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("Choose whether your saved repository list and score snapshots should follow your GitHub account.")}</p>
        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} disabled={busy} onChange={(event) => void setSync(event.target.checked)} className="size-4 accent-primary" />
          {t("Sync saved repositories to this account")}
        </label>
        {enabled && <p className="mt-2 text-xs text-muted-foreground">{t("Saved repositories on this account")}: {count}</p>}
        {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{t(message)}</p>}
      </section>
    </div>
  );
}

async function saveAccountRepositories(repositories: SavedRepository[]) {
  const response = await fetch("/api/account/saved-repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositories }),
  });
  if (!response.ok) {
    const body = await response.json() as { message?: string };
    throw new Error(body.message ?? "Saved repositories couldn't be synced.");
  }
}

function mergeRepositories(local: SavedRepository[], remote: SavedRepository[]): SavedRepository[] {
  const merged = new Map<string, SavedRepository>();
  for (const item of [...remote, ...local]) {
    const key = item.url.toLowerCase().replace(/\/$/, "");
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...item, scoreHistory: item.scoreHistory ?? [] });
      continue;
    }
    const scoreHistory = [...(current.scoreHistory ?? []), ...(item.scoreHistory ?? [])]
      .filter((snapshot, index, all) => all.findIndex((candidate) => candidate.analyzedAt === snapshot.analyzedAt) === index)
      .sort((a, b) => Date.parse(a.analyzedAt) - Date.parse(b.analyzedAt))
      .slice(-12);
    const currentRefreshed = current.lastRefreshedAt ? Date.parse(current.lastRefreshedAt) : 0;
    const itemRefreshed = item.lastRefreshedAt ? Date.parse(item.lastRefreshedAt) : 0;
    const latest = itemRefreshed > currentRefreshed ? item : current;
    merged.set(key, {
      ...latest,
      savedAt: Date.parse(current.savedAt) <= Date.parse(item.savedAt) ? current.savedAt : item.savedAt,
      lastRefreshedAt: itemRefreshed > currentRefreshed ? item.lastRefreshedAt : current.lastRefreshedAt,
      scoreHistory,
    });
  }
  return [...merged.values()]
    .sort((a, b) => Date.parse(b.lastRefreshedAt ?? b.savedAt) - Date.parse(a.lastRefreshedAt ?? a.savedAt))
    .slice(0, 100);
}
