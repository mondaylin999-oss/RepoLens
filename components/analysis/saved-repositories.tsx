"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readSavedRepositories, type SavedRepository } from "@/lib/analysis/local-history";

export function SavedRepositories() {
  const [ready, setReady] = useState(false);
  const [repositories, setRepositories] = useState<SavedRepository[]>([]);

  useEffect(() => {
    setRepositories(readSavedRepositories());
    setReady(true);
  }, []);

  if (!ready || repositories.length === 0) return null;

  return (
    <section aria-labelledby="saved-repositories-heading" className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h2 id="saved-repositories-heading" className="font-semibold">Saved repositories</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your list is stored only in this browser. No account needed.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {repositories.map((item) => (
            <li key={item.url} className="min-w-56 rounded-lg border bg-card p-3">
              <Link href={`/analyze?url=${encodeURIComponent(item.url)}`} className="text-sm font-medium text-primary hover:underline">
                {item.repository}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.lastRefreshedAt
                  ? `Last refreshed ${new Date(item.lastRefreshedAt).toLocaleString()}`
                  : `Saved ${new Date(item.savedAt).toLocaleDateString()}`}
              </p>
              <ScoreHistoryChart repository={item.repository} snapshots={item.scoreHistory ?? []} />
              <Link href={`/analyze?url=${encodeURIComponent(item.url)}`} className="mt-2 inline-flex text-xs font-medium text-primary hover:underline">
                Analyze again →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ScoreHistoryChart({ repository, snapshots }: { repository: string; snapshots: NonNullable<SavedRepository["scoreHistory"]> }) {
  if (snapshots.length === 0) return <p className="mt-2 text-xs text-muted-foreground">Score history will appear after an analysis.</p>;
  const values = snapshots.map((item) => item.score ?? item.earned);
  const points = values.map((score, index) => {
    const x = snapshots.length === 1 ? 70 : 8 + (index * 124) / (snapshots.length - 1);
    const y = 38 - (score * 0.32);
    return `${x},${y}`;
  }).join(" ");
  const latest = snapshots[snapshots.length - 1];

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">Score history · {snapshots.length} {snapshots.length === 1 ? "analysis" : "analyses"}</p>
        <span className="text-sm font-semibold tabular-nums">{latest.complete ? `${latest.score}/100` : `≥ ${latest.earned}/100`}</span>
      </div>
      <svg role="img" aria-label={`Score history for ${repository}: ${values.join(", ")} points`} viewBox="0 0 140 44" className="mt-1 h-11 w-full text-primary">
        <line x1="4" y1="38" x2="136" y2="38" className="stroke-border" strokeWidth="1" />
        {snapshots.length > 1 && <polyline points={points} fill="none" className="stroke-current" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {values.map((score, index) => {
          const x = snapshots.length === 1 ? 70 : 8 + (index * 124) / (snapshots.length - 1);
          const y = 38 - (score * 0.32);
          return <circle key={`${snapshots[index].analyzedAt}-${index}`} cx={x} cy={y} r="2.5" className="fill-current" />;
        })}
      </svg>
    </div>
  );
}
