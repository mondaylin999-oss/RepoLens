"use client";

import { useEffect, useState } from "react";

export function RecommendationDone({ repoName, recommendationId, title }: { repoName: string; recommendationId: string; title: string }) {
  const storageKey = `repolens-recommendations:${repoName}`;
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, boolean>;
      setDone(saved[recommendationId] === true);
    } catch {
      setDone(false);
    }
  }, [storageKey, recommendationId]);

  function toggle() {
    const next = !done;
    setDone(next);
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, boolean>;
      window.localStorage.setItem(storageKey, JSON.stringify({ ...saved, [recommendationId]: next }));
    } catch {
      // The checkbox still works for the current page if storage is unavailable.
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
      <input type="checkbox" checked={done} onChange={toggle} aria-label={`Mark ${title} as complete`} className="size-4 accent-primary" />
      <span>{done ? "Completed" : "Mark complete"}</span>
    </label>
  );
}
