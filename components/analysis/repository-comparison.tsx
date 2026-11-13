"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHECK_DEFINITIONS } from "@/lib/analysis/checks";
import { readSavedRepositories, type SavedRepository } from "@/lib/analysis/local-history";
import type { AnalysisResult, AnalyzeResponse, CheckStatus } from "@/lib/types";

type Pair = { first: AnalysisResult; second: AnalysisResult };

const STATUS_LABEL: Record<CheckStatus, string> = { pass: "Passed", fail: "Needs work", unknown: "Unverified" };

export function RepositoryComparison() {
  const [repositories, setRepositories] = useState<SavedRepository[]>([]);
  const [firstUrl, setFirstUrl] = useState("");
  const [secondUrl, setSecondUrl] = useState("");
  const [pair, setPair] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const refresh = () => {
      const saved = readSavedRepositories();
      setRepositories(saved);
      setFirstUrl(saved[0]?.url ?? "");
      setSecondUrl(saved[1]?.url ?? "");
      setPair(null);
    };
    refresh();
    window.addEventListener("repolens-saved-repositories-change", refresh);
    return () => window.removeEventListener("repolens-saved-repositories-change", refresh);
  }, []);

  async function compare() {
    if (!firstUrl || !secondUrl || firstUrl === secondUrl) return;
    setLoading(true);
    setError("");
    setPair(null);
    try {
      const results = await Promise.all([firstUrl, secondUrl].map(async (url) => {
        const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`);
        const body = await response.json() as AnalyzeResponse;
        if (!body.ok) throw new Error(body.error.message);
        return body.data;
      }));
      setPair({ first: results[0], second: results[1] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't compare these repositories. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (repositories.length < 2) return null;
  const firstName = repositories.find((repo) => repo.url === firstUrl)?.repository ?? "First repository";
  const secondName = repositories.find((repo) => repo.url === secondUrl)?.repository ?? "Second repository";

  return (
    <section aria-labelledby="compare-repositories-heading" className="border-b bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 id="compare-repositories-heading" className="text-xl font-semibold">Compare saved repositories</h2>
        <p className="mt-1 text-sm text-muted-foreground">Run fresh checks and compare readiness scores side by side.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            First repository
            <select value={firstUrl} onChange={(event) => setFirstUrl(event.target.value)} className="h-10 rounded-lg border bg-background px-3 font-normal">
              {repositories.map((repo) => <option key={repo.url} value={repo.url}>{repo.repository}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Second repository
            <select value={secondUrl} onChange={(event) => setSecondUrl(event.target.value)} className="h-10 rounded-lg border bg-background px-3 font-normal">
              {repositories.map((repo) => <option key={repo.url} value={repo.url}>{repo.repository}</option>)}
            </select>
          </label>
          <Button type="button" onClick={compare} disabled={loading || !firstUrl || !secondUrl || firstUrl === secondUrl}>
            {loading ? "Comparing…" : "Compare repositories"}
          </Button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {pair && (
          <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
            <div className="grid min-w-[32rem] grid-cols-3 border-b bg-muted/40 px-4 py-3 text-sm font-medium">
              <span>Readiness score</span>
              <span className="truncate" title={pair.first.repo.fullName}>{pair.first.repo.fullName}</span>
              <span className="truncate" title={pair.second.repo.fullName}>{pair.second.repo.fullName}</span>
              <span className="text-sm font-medium">Total</span>
              <strong className="text-lg">{pair.first.score.complete ? `${pair.first.score.score}/100` : `≥ ${pair.first.score.earned}/100`}</strong>
              <strong className="text-lg">{pair.second.score.complete ? `${pair.second.score.score}/100` : `≥ ${pair.second.score.earned}/100`}</strong>
            </div>
            <div className="grid min-w-[32rem] grid-cols-3 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Check</span><span>{firstName}</span><span>{secondName}</span>
            </div>
            {CHECK_DEFINITIONS.map((check) => {
              const firstStatus = pair.first.checks.find((item) => item.id === check.id)?.status ?? "unknown";
              const secondStatus = pair.second.checks.find((item) => item.id === check.id)?.status ?? "unknown";
              return (
                <div key={check.id} className="grid min-w-[32rem] grid-cols-3 border-b px-4 py-3 text-sm last:border-b-0">
                  <span>{check.label}</span>
                  <span>{STATUS_LABEL[firstStatus]}</span>
                  <span>{STATUS_LABEL[secondStatus]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
