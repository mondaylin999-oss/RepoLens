"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { AnalysisResult, AnalyzeResponse, ApiError } from "@/lib/types";
import { RepoUrlForm } from "@/components/github/repo-url-form";
import { RepoOverview } from "@/components/github/repo-overview";
import { ScoreCard } from "./score-card";
import { Checklist } from "./checklist";
import { RecommendationList } from "./recommendations";
import { DescriptionGenerator } from "./description-generator";
import { AnalysisSkeleton } from "./analysis-skeleton";
import { ErrorState, EmptyState } from "./states";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AnalysisResult }
  | { status: "error"; error: ApiError };

export function AnalyzeView({ url }: { url: string }) {
  const [state, setState] = useState<State>(url ? { status: "loading" } : { status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(`/api/analyze?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then(async (res) => {
        let body: AnalyzeResponse;
        try {
          body = (await res.json()) as AnalyzeResponse;
        } catch {
          throw new Error("bad-response");
        }
        setState(body.ok ? { status: "success", data: body.data } : { status: "error", error: body.error });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: {
            code: "NETWORK_ERROR",
            message: err instanceof Error && err.message === "bad-response"
              ? "The server returned an unexpected response. Please try again."
              : "Couldn't reach RepoLens. Check your connection and try again.",
          },
        });
      });
    return () => controller.abort();
  }, [url, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Repository analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste any public GitHub repository URL to check its portfolio readiness.</p>
        <RepoUrlForm key={url} defaultValue={url} busy={state.status === "loading"} autoFocus={!url} className="mt-4 max-w-3xl" />
      </div>

      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "idle" && <EmptyState />}
        {state.status === "loading" && <AnalysisSkeleton />}
        {state.status === "error" && <ErrorState error={state.error} onRetry={retry} />}
        {state.status === "success" && <Results data={state.data} submittedUrl={url} />}
      </div>
    </div>
  );
}

function Results({ data, submittedUrl }: { data: AnalysisResult; submittedUrl: string }) {
  const { tree } = data;
  return (
    <div className="animate-fade-up space-y-6">
      <p className="text-sm text-muted-foreground">
        Analyzed repository:{" "}
        <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-primary hover:underline">
          {submittedUrl}
        </a>
      </p>
      {tree.status !== "complete" && (
        <div role="status" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Analysis incomplete</p>
            <p className="mt-0.5 text-muted-foreground">
              {tree.reason ?? "The repository's file list couldn't be fully read."} Checks that depend on missing files are marked
              &ldquo;Unverified&rdquo; instead of failed, and no final score is shown.
            </p>
          </div>
        </div>
      )}
      <RepoOverview repo={data.repo} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ScoreCard score={data.score} checks={data.checks} />
        <Checklist checks={data.checks} />
      </div>
      <RecommendationList recommendations={data.recommendations} complete={data.score.complete} />
      <DescriptionGenerator description={data.description} />
      <p className="text-xs text-muted-foreground">
        <Info className="mr-1.5 inline size-3.5 align-[-2px]" />
        Analyzed {tree.fileCount.toLocaleString()} files on the <code className="font-mono">{data.repo.defaultBranch}</code> branch ·{" "}
        {new Date(data.analyzedAt).toLocaleString()} · Results may be cached for up to 5 minutes.
      </p>
    </div>
  );
}
