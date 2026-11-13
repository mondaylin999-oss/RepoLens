"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifySavedRepositoriesChanged, readSavedRepositories, SAVED_REPOSITORIES_CHANGE_EVENT, SAVED_REPOSITORIES_KEY, type SavedRepository } from "@/lib/analysis/local-history";
import { useLanguage } from "@/components/layout/language-provider";

export function SavedRepositories() {
  const { text: t, language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [repositories, setRepositories] = useState<SavedRepository[]>([]);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [removedMessage, setRemovedMessage] = useState("");

  useEffect(() => {
    const refresh = () => setRepositories(readSavedRepositories());
    refresh();
    window.addEventListener(SAVED_REPOSITORIES_CHANGE_EVENT, refresh);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reveal browser-only saved data after hydration.
    setReady(true);
    return () => window.removeEventListener(SAVED_REPOSITORIES_CHANGE_EVENT, refresh);
  }, []);

  if (!ready || repositories.length === 0) return null;
  const languages = Array.from(new Set(repositories.map((item) => item.language || "No language"))).sort((a, b) => a.localeCompare(b));
  const filteredRepositories = repositories.filter((item) => {
    if (languageFilter !== "all" && (item.language || "No language") !== languageFilter) return false;
    if (scoreFilter === "all") return true;
    const latest = item.scoreHistory?.at(-1);
    if (scoreFilter === "unverified") return latest !== undefined && !latest.complete;
    if (scoreFilter === "no-score") return latest === undefined;
    if (!latest?.complete || latest.score === null) return false;
    if (scoreFilter === "80") return latest.score >= 80;
    if (scoreFilter === "60") return latest.score >= 60 && latest.score < 80;
    return latest.score < 60;
  });

  function exportRepositories(format: "json" | "csv") {
    const date = new Date().toISOString().slice(0, 10);
    let content: string;
    let mime: string;
    let extension: string;
    if (format === "json") {
      content = JSON.stringify(repositories, null, 2);
      mime = "application/json";
      extension = "json";
    } else {
      const quote = (value: string | number | boolean | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [
        ["repository", "url", "language", "savedAt", "lastRefreshedAt", "latestScore", "scoreComplete"],
        ...repositories.map((item) => {
          const latest = item.scoreHistory?.at(-1);
          return [item.repository, item.url, item.language ?? "", item.savedAt, item.lastRefreshedAt ?? "", latest?.score ?? latest?.earned ?? "", latest?.complete ?? ""];
        }),
      ];
      content = rows.map((row) => row.map(quote).join(",")).join("\r\n");
      mime = "text/csv;charset=utf-8";
      extension = "csv";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `repolens-saved-repositories-${date}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function removeRepository(url: string) {
    const next = repositories.filter((item) => item.url !== url);
    try {
      window.localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify(next));
    } catch {
      setRemovedMessage("Couldn't update browser storage. Please try again.");
      return;
    }
    setRepositories(next);
    setRemovedMessage("Repository removed from this device.");
    notifySavedRepositoriesChanged("remove", url);
  }

  return (
    <section aria-labelledby="saved-repositories-heading" className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="saved-repositories-heading" className="font-semibold">{t("Saved repositories")}</h2>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => exportRepositories("json")}><Download aria-hidden="true" />{t("Export JSON")}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => exportRepositories("csv")}><Download aria-hidden="true" />{t("Export CSV")}</Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("Your list is stored only in this browser. No account needed.")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Saved scores can become outdated as repositories change. Choose “Analyze again” to refresh one.")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            {t("Language")}
            <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className="h-9 min-w-40 rounded-lg border bg-background px-3 text-sm font-normal text-foreground">
              <option value="all">{t("All languages")}</option>
              {languages.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            {t("Score")}
            <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)} className="h-9 min-w-40 rounded-lg border bg-background px-3 text-sm font-normal text-foreground">
              <option value="all">{t("All scores")}</option>
              <option value="80">80–100</option>
              <option value="60">60–79</option>
              <option value="below-60">{t("Below 60")}</option>
              <option value="unverified">{t("Unverified score")}</option>
              <option value="no-score">{t("Not analyzed yet")}</option>
            </select>
          </label>
        </div>
        {removedMessage && <p role="status" className="mt-3 text-sm text-muted-foreground">{t(removedMessage)}</p>}
        <ul className="mt-4 flex flex-wrap gap-2">
          {filteredRepositories.map((item) => (
            <li key={item.url} className="min-w-56 rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/analyze?url=${encodeURIComponent(item.url)}`} className="text-sm font-medium text-primary hover:underline">
                  {item.repository}
                </Link>
                <Button type="button" variant="ghost" size="icon" aria-label={`${t("Remove")} ${item.repository}`} onClick={() => removeRepository(item.url)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.lastRefreshedAt
                  ? `${t("Last refreshed")} ${new Date(item.lastRefreshedAt).toLocaleString(language === "my" ? "my-MM" : "en-US")}`
                  : `${t("Saved")} ${new Date(item.savedAt).toLocaleDateString(language === "my" ? "my-MM" : "en-US")}`}
              </p>
              <ScoreHistoryChart repository={item.repository} snapshots={item.scoreHistory ?? []} />
              <Link href={`/analyze?url=${encodeURIComponent(item.url)}`} className="mt-2 inline-flex text-xs font-medium text-primary hover:underline">
                {t("Analyze again")} →
              </Link>
            </li>
          ))}
        </ul>
        {filteredRepositories.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("No saved repositories match these filters.")}</p>}
      </div>
    </section>
  );
}

function ScoreHistoryChart({ repository, snapshots }: { repository: string; snapshots: NonNullable<SavedRepository["scoreHistory"]> }) {
  const { text: t, language } = useLanguage();
  if (snapshots.length === 0) return <p className="mt-2 text-xs text-muted-foreground">{t("Score history will appear after an analysis.")}</p>;
  const values = snapshots.map((item) => item.score ?? item.earned);
  const points = values.map((score, index) => {
    const x = snapshots.length === 1 ? 70 : 8 + (index * 124) / (snapshots.length - 1);
    const y = 38 - (score * 0.32);
    return `${x},${y}`;
  }).join(" ");
  const latest = snapshots[snapshots.length - 1];
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === "my" ? "my-MM" : "en-US", { dateStyle: "medium" }).format(new Date(value));
  const historyDescription = snapshots.map((snapshot) => {
    const score = snapshot.complete
      ? `${snapshot.score} ${t("out of 100")}`
      : `${t("at least")} ${snapshot.earned} ${t("of 100 points confirmed")}`;
    return `${formatDate(snapshot.analyzedAt)}: ${score}`;
  }).join("; ");

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("Score history")} · {snapshots.length} {t(snapshots.length === 1 ? "analysis" : "analyses")}</p>
        <span className="text-sm font-semibold tabular-nums">{latest.complete ? `${latest.score}/100` : `≥ ${latest.earned}/100`}</span>
      </div>
      <svg role="img" aria-label={`${t("Score history for")} ${repository}. ${historyDescription}`} viewBox="0 0 140 44" className="mt-1 h-11 w-full text-primary">
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
