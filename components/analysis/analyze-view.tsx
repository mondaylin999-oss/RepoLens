"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { AnalysisResult, AnalyzeResponse, ApiError } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RepoUrlForm } from "@/components/github/repo-url-form";
import { RepoOverview } from "@/components/github/repo-overview";
import { ScoreCard } from "./score-card";
import { Checklist } from "./checklist";
import { RecommendationList } from "./recommendations";
import { DescriptionGenerator } from "./description-generator";
import { AnalysisSkeleton } from "./analysis-skeleton";
import { ErrorState, EmptyState } from "./states";
import { ANALYSIS_HISTORY_KEY, HISTORY_ENABLED_KEY, readAnalysisHistory } from "@/lib/analysis/local-history";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AnalysisResult }
  | { status: "error"; error: ApiError };

export function AnalyzeView({ url }: { url: string }) {
  const [state, setState] = useState<State>(url ? { status: "loading" } : { status: "idle" });
  const [loadingMessage, setLoadingMessage] = useState("Connecting to GitHub…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoadingMessage("Connecting to GitHub…");
    const detailsTimer = window.setTimeout(() => setLoadingMessage("Reading repository details…"), 900);
    const filesTimer = window.setTimeout(() => setLoadingMessage("Checking repository files and preparing your results…"), 2400);
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
    return () => {
      controller.abort();
      window.clearTimeout(detailsTimer);
      window.clearTimeout(filesTimer);
    };
  }, [url, attempt]);

  useEffect(() => {
    if (state.status !== "success") return;
    try {
      if (window.localStorage.getItem(HISTORY_ENABLED_KEY) !== "true") return;
      const data = state.data;
      const entry = {
        repository: data.repo.fullName,
        url: data.repo.htmlUrl,
        score: data.score.score,
        earned: data.score.earned,
        complete: data.score.complete,
        analyzedAt: data.analyzedAt,
      };
      const next = [entry, ...readAnalysisHistory().filter((item) => item.url !== entry.url)].slice(0, 10);
      window.localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Analysis results remain available even when browser storage is disabled.
    }
  }, [state]);

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
        {state.status === "loading" && <AnalysisSkeleton message={loadingMessage} />}
        {state.status === "error" && <ErrorState error={state.error} onRetry={retry} />}
        {state.status === "success" && <Results data={state.data} submittedUrl={url} />}
      </div>
    </div>
  );
}

function Results({ data, submittedUrl }: { data: AnalysisResult; submittedUrl: string }) {
  const { tree } = data;
  const licenseCheck = data.checks.find((check) => check.id === "license");
  const licenseFile = licenseCheck?.matches.find((match) => /^(licen[sc]e|copying|unlicense)([-._][A-Za-z0-9.+-]*)?$/i.test(match));
  const passedChecks = data.checks.filter((check) => check.status === "pass").length;
  const summary = [
    {
      label: "Readiness score",
      value: data.score.complete ? `${data.score.score}/100` : `≥ ${data.score.earned}/100`,
      detail: data.score.complete ? "out of 100 points" : `${data.score.unknownPoints} points unverified`,
    },
    {
      label: "Checks passed",
      value: `${passedChecks}/${data.checks.length}`,
      detail: `${data.checks.filter((check) => check.status === "unknown").length} unverified`,
    },
    {
      label: "Recommendations",
      value: data.recommendations.length.toString(),
      detail: "ways to improve",
    },
    {
      label: "Files returned",
      value: tree.fileCount.toLocaleString(),
      detail: tree.status === "complete" ? "complete file list" : "file list incomplete",
    },
  ];

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Analyzed repository:{" "}
          <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-primary hover:underline">
            {submittedUrl}
          </a>
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
          <Link href="/analyze">Analyze another repository</Link>
        </Button>
      </div>
      <dl aria-label="Analysis summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{item.value}</dd>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </dl>
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
      <RepoOverview repo={data.repo} licenseFile={licenseFile} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ScoreCard score={data.score} checks={data.checks} />
        <Checklist
          checks={data.checks}
          repoUrl={data.repo.htmlUrl}
          defaultBranch={data.repo.defaultBranch}
          fileCount={tree.fileCount}
          treeStatus={tree.status}
        />
      </div>
      <RecommendationList recommendations={data.recommendations} complete={data.score.complete} repo={data.repo} />
      <DescriptionGenerator description={data.description} repo={data.repo} />
      <p className="text-xs text-muted-foreground">
        <Info className="mr-1.5 inline size-3.5 align-[-2px]" />
        Analyzed {tree.fileCount.toLocaleString()} files on the <code className="font-mono">{data.repo.defaultBranch}</code> branch ·{" "}
        {new Date(data.analyzedAt).toLocaleString()} · Results may be cached for up to 5 minutes.
      </p>
    </div>
  );
}
