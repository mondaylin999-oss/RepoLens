"use client";

import { AlertCircle, Clock, FolderX, Lock, RefreshCw, SearchX, WifiOff, ScanSearch } from "lucide-react";
import type { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";
import Link from "next/link";

const TITLES: Record<ApiError["code"], { title: string; icon: typeof AlertCircle; retry: boolean }> = {
  INVALID_URL: { title: "That URL isn't a GitHub repository", icon: AlertCircle, retry: false },
  NOT_FOUND: { title: "Repository not found", icon: SearchX, retry: false },
  INACCESSIBLE: { title: "Repository not accessible", icon: Lock, retry: false },
  EMPTY_REPOSITORY: { title: "This repository is empty", icon: FolderX, retry: false },
  RATE_LIMITED: { title: "GitHub rate limit reached", icon: Clock, retry: true },
  TIMEOUT: { title: "GitHub took too long", icon: Clock, retry: true },
  NETWORK_ERROR: { title: "Connection problem", icon: WifiOff, retry: true },
  UPSTREAM_UNAVAILABLE: { title: "GitHub is unavailable", icon: AlertCircle, retry: true },
  INTERNAL_ERROR: { title: "Something went wrong", icon: AlertCircle, retry: true },
};

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const { text: t } = useLanguage();
  const meta = TITLES[error.code] ?? TITLES.INTERNAL_ERROR;
  const Icon = meta.icon;
  return (
    <div role="alert" className="animate-fade-up flex flex-col items-center rounded-xl border bg-card px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger"><Icon className="size-6" /></span>
      <h2 className="mt-4 text-lg font-semibold">{t(meta.title)}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{t(error.message)}</p>
      {error.retryAt && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("The limit resets at")} <time dateTime={error.retryAt}>{new Date(error.retryAt).toLocaleTimeString()}</time>.
        </p>
      )}
      {error.code === "RATE_LIMITED" && (
        <div className="mt-4 max-w-lg rounded-lg border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground">
          <p>{t("Without a token, GitHub allows 60 public API requests per hour for each server IP. Everyone using this RepoLens deployment shares that allowance, so busy periods can use it up early.")}</p>
          <p className="mt-2">{t("Wait until the reset time above, or add your optional read-only GitHub token in the form above. GitHub's authenticated limit is typically 5,000 requests per hour for a personal account. Avoid repeated retries before the reset.")}</p>
          <a className="mt-2 inline-block text-primary underline underline-offset-4" href="https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api" target="_blank" rel="noopener noreferrer">
            {t("Read GitHub's rate-limit details")}
          </a>
        </div>
      )}
      {meta.retry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}><RefreshCw /> {t("Try again")}</Button>
      )}
      {["TIMEOUT", "NETWORK_ERROR", "UPSTREAM_UNAVAILABLE"].includes(error.code) && (
        <Link href="/status" className="mt-4 text-sm font-medium text-primary hover:underline">{t("Check GitHub's service status")}</Link>
      )}
    </div>
  );
}

export function EmptyState() {
  const { text: t } = useLanguage();
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><ScanSearch className="size-6" /></span>
      <h2 className="mt-4 text-lg font-semibold">{t("No repository selected")}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {t("Paste a public repository URL above, like")} <code className="font-mono">https://github.com/owner/repository</code>{t(", to see its readiness score, checklist and recommendations.")}
      </p>
    </div>
  );
}
