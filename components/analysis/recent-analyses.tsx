"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ANALYSIS_HISTORY_KEY, HISTORY_ENABLED_KEY, readAnalysisHistory, type LocalAnalysisHistoryEntry } from "@/lib/analysis/local-history";

export function RecentAnalyses() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [history, setHistory] = useState<LocalAnalysisHistoryEntry[]>([]);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(HISTORY_ENABLED_KEY) === "true");
      setHistory(readAnalysisHistory());
    } catch {
      // Keep the optional history unavailable if browser storage is blocked.
    }
    setReady(true);
  }, []);

  function toggleHistory(checked: boolean) {
    setEnabled(checked);
    try {
      window.localStorage.setItem(HISTORY_ENABLED_KEY, checked ? "true" : "false");
      setHistory(readAnalysisHistory());
    } catch {
      // The control remains usable for the current page session.
    }
  }

  function clearHistory() {
    try {
      window.localStorage.removeItem(ANALYSIS_HISTORY_KEY);
    } catch {
      // Keep the on-screen list clear for this session if storage is blocked.
    }
    setHistory([]);
  }

  if (!ready) return null;

  return (
    <section aria-labelledby="recent-analyses-heading" className="border-b bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="recent-analyses-heading" className="font-semibold">Recent analyses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Optional history, saved only in this browser.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => toggleHistory(event.target.checked)}
                className="size-4 accent-primary"
              />
              Save analysis history on this device
            </label>
            {enabled && history.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearHistory}>
                Clear history
              </Button>
            )}
          </div>
        </div>
        {enabled && history.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <li key={item.url} className="rounded-lg border bg-card px-4 py-3">
                <Link href={`/analyze?url=${encodeURIComponent(item.url)}`} className="font-medium text-primary hover:underline">
                  {item.repository}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.complete ? `${item.score}/100` : `At least ${item.earned}/100`} · {new Date(item.analyzedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        {enabled && history.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Your analyzed repositories will appear here.</p>}
      </div>
    </section>
  );
}
