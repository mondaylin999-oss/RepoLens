import { AlertCircle, Clock, FolderX, Lock, RefreshCw, SearchX, WifiOff, ScanSearch } from "lucide-react";
import type { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/button";

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
  const meta = TITLES[error.code] ?? TITLES.INTERNAL_ERROR;
  const Icon = meta.icon;
  return (
    <div role="alert" className="animate-fade-up flex flex-col items-center rounded-xl border bg-card px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger"><Icon className="size-6" /></span>
      <h2 className="mt-4 text-lg font-semibold">{meta.title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
      {error.retryAt && (
        <p className="mt-2 text-sm text-muted-foreground">
          The limit resets at <time dateTime={error.retryAt}>{new Date(error.retryAt).toLocaleTimeString()}</time>.
        </p>
      )}
      {meta.retry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}><RefreshCw /> Try again</Button>
      )}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><ScanSearch className="size-6" /></span>
      <h2 className="mt-4 text-lg font-semibold">No repository selected</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Paste a public repository URL above, like <code className="font-mono">https://github.com/owner/repository</code>, to see its readiness score, checklist and recommendations.
      </p>
    </div>
  );
}
