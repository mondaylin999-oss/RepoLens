"use client";

import { useEffect, useState } from "react";
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
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border bg-card px-3 py-2 text-sm font-medium text-primary hover:underline">
                {item.repository}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
