"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Info } from "lucide-react";
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
import { ACCOUNT_SYNC_ENABLED_KEY, ANALYSIS_HISTORY_KEY, HISTORY_ENABLED_KEY, readAnalysisHistory, readSavedRepositories, SAVED_REPOSITORIES_KEY } from "@/lib/analysis/local-history";
import { SaveRepositoryButton } from "./save-repository-button";
import { CopyButton } from "./copy-button";
import { ShareCardButton } from "./share-card-button";
import { useLanguage } from "@/components/layout/language-provider";
import { useGitHubToken } from "@/components/layout/github-token-provider";
import { githubTokenHeader } from "@/lib/github/request-token";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AnalysisResult }
  | { status: "error"; error: ApiError };

export function AnalyzeView({ url, checklistOnly = false }: { url: string; checklistOnly?: boolean }) {
  const { text: t } = useLanguage();
  const { token } = useGitHubToken();
  const [state, setState] = useState<State>(url ? { status: "loading" } : { status: "idle" });
  const [loadingMessage, setLoadingMessage] = useState("Connecting to GitHub…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoadingMessage("Connecting to GitHub…");
    const detailsTimer = window.setTimeout(() => setLoadingMessage("Reading repository details…"), 900);
    const filesTimer = window.setTimeout(() => setLoadingMessage("Checking repository files and preparing your results…"), 2400);
    fetch(`/api/analyze?url=${encodeURIComponent(url)}`, { signal: controller.signal, headers: githubTokenHeader(token) })
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
  }, [url, attempt, token]);

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

  useEffect(() => {
    if (state.status !== "success") return;
    try {
      if (window.localStorage.getItem(ACCOUNT_SYNC_ENABLED_KEY) !== "true") return;
      const data = state.data;
      void fetch("/api/account/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [{
          repository: data.repo.fullName,
          url: data.repo.htmlUrl,
          score: data.score.score,
          earned: data.score.earned,
          complete: data.score.complete,
          analyzedAt: data.analyzedAt,
        }] }),
      });
    } catch {
      // Keep the analysis available if account sync is unavailable.
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== "success") return;
    try {
      const data = state.data;
      const saved = readSavedRepositories();
      const index = saved.findIndex((item) => item.url === data.repo.htmlUrl);
      if (index < 0) return;
      const entry = saved[index];
      const snapshot = {
        score: data.score.score,
        earned: data.score.earned,
        complete: data.score.complete,
        analyzedAt: data.analyzedAt,
      };
      const scoreHistory = [...(entry.scoreHistory ?? []).filter((item) => item.analyzedAt !== snapshot.analyzedAt), snapshot].slice(-12);
      saved[index] = { ...entry, language: data.repo.language, lastRefreshedAt: snapshot.analyzedAt, scoreHistory };
      window.localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify(saved));
    } catch {
      // Keep the result visible if browser storage is unavailable.
    }
  }, [state]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="no-print mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Repository analysis")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Paste any public GitHub repository URL to check its portfolio readiness.")}</p>
        <RepoUrlForm key={url} defaultValue={url} busy={state.status === "loading"} autoFocus={!url} className="mt-4 max-w-3xl" />
      </div>

      <div aria-busy={state.status === "loading"}>
        {state.status === "idle" && <EmptyState />}
        {state.status === "loading" && <AnalysisSkeleton message={t(loadingMessage)} />}
        {state.status === "error" && <ErrorState error={state.error} onRetry={retry} />}
        {state.status === "success" && <Results data={state.data} submittedUrl={url} checklistOnly={checklistOnly} />}
      </div>
    </div>
  );
}

function Results({ data, submittedUrl, checklistOnly }: { data: AnalysisResult; submittedUrl: string; checklistOnly: boolean }) {
  const { text: t, language } = useLanguage();
  const [includeScoreInShare, setIncludeScoreInShare] = useState(true);
  const [shareOrigin, setShareOrigin] = useState("");
  useEffect(() => setShareOrigin(window.location.origin), []);
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

  function saveAsPdf() {
    const previousTitle = document.title;
    document.title = `${data.repo.fullName} - RepoLens analysis`;
    window.addEventListener("afterprint", () => { document.title = previousTitle; }, { once: true });
    window.print();
  }

  function exportMarkdown() {
    const checkLines = data.checks.flatMap((check) => [
      `### ${check.label} — ${check.status.toUpperCase()} (${check.points}/${check.maxPoints})`,
      "",
      check.evidence,
      "",
      ...(check.matches.length
        ? check.matches.map((match) => `- ${markdownEvidenceLink(match, data, check.id)}`)
        : [`- [GitHub repository](${data.repo.htmlUrl})`]),
      "",
    ]);
    const recommendationLines = data.recommendations.flatMap((recommendation) => [
      `### ${recommendation.title}`,
      "",
      recommendation.whyItMatters,
      "",
      ...recommendation.howToImprove.map((step, index) => `${index + 1}. ${step}`),
      "",
    ]);
    const content = [
      `# RepoLens analysis: ${data.repo.fullName}`,
      "",
      `Repository: ${data.repo.htmlUrl}`,
      `Analyzed: ${new Date(data.analyzedAt).toISOString()}`,
      "",
      "## Readiness score",
      "",
      data.score.complete ? `**${data.score.score}/100**` : `**At least ${data.score.earned}/100** (${data.score.unknownPoints} points unverified)`,
      "",
      "## Checks and evidence",
      "",
      ...checkLines,
      "## Recommendations",
      "",
      ...recommendationLines,
      "## About this score",
      "",
      "The readiness score measures portfolio presentation only. It does not measure code quality or security.",
    ].join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${data.repo.fullName.replaceAll("/", "-")}-repolens-report.md`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  const planningSummary = [
    "RepoLens repository summary",
    `Repository: ${data.repo.fullName}`,
    `GitHub URL: ${data.repo.htmlUrl}`,
    data.repo.description ? `Description: ${data.repo.description}` : "Description: Not set",
    `Readiness score: ${data.score.complete ? `${data.score.score}/100` : `At least ${data.score.earned}/100 (${data.score.unknownPoints} points unverified)`}`,
    "",
    "Checks",
    ...data.checks.map((check) => `- ${check.label}: ${check.status === "pass" ? "Passed" : check.status === "fail" ? "Needs work" : "Unverified"} — ${check.evidence}`),
    "",
    "Suggested next steps",
    ...(data.recommendations.length
      ? data.recommendations.flatMap((recommendation) => [`- ${recommendation.title}`, ...recommendation.howToImprove.map((step) => `  ${step}`)])
      : ["- No improvement steps were suggested for this analysis."]),
    "",
    "Note: This readiness score measures portfolio presentation only. It does not measure code quality or security.",
  ].join("\n");
  const shareParams = new URLSearchParams({ url: data.repo.htmlUrl });
  if (!includeScoreInShare) shareParams.set("view", "checklist");
  const shareUrl = `${shareOrigin}/analyze?${shareParams.toString()}`;

  if (checklistOnly) {
    return (
      <div className="print-report animate-fade-up space-y-6">
        <p role="status" className="sr-only">{t("Checklist results are ready for")} {data.repo.fullName}.</p>
        <div>
          <h2 className="text-xl font-semibold">{t("Checklist-only report")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{data.repo.fullName} · <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t("View on GitHub")}</a></p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Based on public GitHub repository data checked")} {new Date(data.analyzedAt).toLocaleString(language === "my" ? "my-MM" : "en-US")}.</p>
        </div>
        <Checklist checks={data.checks} repoUrl={data.repo.htmlUrl} defaultBranch={data.repo.defaultBranch} fileCount={data.tree.fileCount} treeStatus={data.tree.status} />
      </div>
    );
  }

  return (
    <div className="print-report animate-fade-up space-y-6">
      <p role="status" className="sr-only">
        {t("Analysis complete for")} {data.repo.fullName}. {data.score.complete ? `${t("Readiness score")} ${data.score.score} ${t("out of 100.")}` : `${t("at least")} ${data.score.earned} ${t("confirmed points")}; ${t("some checks are unverified.")}`}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("Analyzed repository:")}{" "}
          <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-primary hover:underline">
            {submittedUrl}
          </a>
        </p>
        <div className="no-print flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>{t("Print report")}</Button>
          <Button type="button" variant="outline" size="sm" onClick={saveAsPdf}>{t("Save as PDF")}</Button>
          <Button type="button" variant="outline" size="sm" onClick={exportMarkdown}><Download aria-hidden="true" />{t("Export Markdown")}</Button>
          <CopyButton value={planningSummary} label="Copy plain text summary" />
          <ShareCardButton repository={data.repo.fullName} score={data.score.score} earned={data.score.earned} complete={data.score.complete} url={data.repo.htmlUrl} />
          <SaveRepositoryButton
            repository={data.repo.fullName}
            url={data.repo.htmlUrl}
            language={data.repo.language}
            snapshot={{ score: data.score.score, earned: data.score.earned, complete: data.score.complete, analyzedAt: data.analyzedAt }}
          />
          <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
            <Link href="/analyze">{t("Analyze another repository")}</Link>
          </Button>
        </div>
      </div>
      <div className="no-print rounded-xl border bg-card p-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={includeScoreInShare} onChange={(event) => setIncludeScoreInShare(event.target.checked)} className="size-4 accent-primary" />
          {t("Include the readiness score in the shared report")}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input aria-label={t("Shareable report URL")} readOnly value={shareUrl} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 font-mono text-xs text-muted-foreground" />
          <CopyButton value={shareUrl} label="Copy link" />
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center rounded-lg border border-input px-3 text-sm font-medium hover:bg-muted">{t("Preview share link")}</a>
        </div>
      </div>
      <dl aria-label={t("Analysis summary")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{t(item.label)}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{item.value}</dd>
            <p className="text-xs text-muted-foreground">{t(item.detail)}</p>
          </div>
        ))}
      </dl>
      {tree.status !== "complete" && (
        <div role="status" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">{t("Analysis incomplete")}</p>
            <p className="mt-0.5 text-muted-foreground">
              {t(tree.reason ?? "The repository's file list couldn't be fully read.")} {t("Checks that depend on missing files are marked")} &ldquo;{t("Unverified")}&rdquo; {t("instead of failed, and no final score is shown.")}
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
        {t("Portfolio presentation only; this score does not measure code quality or security.")} {t("Based on public GitHub repository data.")} {t("Analyzed")} {tree.fileCount.toLocaleString()} {t("files on the")} <code className="font-mono">{data.repo.defaultBranch}</code> {t("branch")} ·{" "}
        {new Date(data.analyzedAt).toLocaleString(language === "my" ? "my-MM" : "en-US")} · {t("Results may be cached for up to 5 minutes.")}
      </p>
    </div>
  );
}

function markdownEvidenceLink(value: string, data: AnalysisResult, checkId: AnalysisResult["checks"][number]["id"]) {
  const label = value.replaceAll("[", "\\[").replaceAll("]", "\\]");
  const licenseMetadata = checkId === "license" && (value === data.repo.license?.name || value === data.repo.license?.spdxId);
  const isRepositoryMetadata = checkId === "description" || checkId === "demo" || licenseMetadata;
  if (!isRepositoryMetadata) {
    const branch = data.repo.defaultBranch.split("/").map(encodeURIComponent).join("/");
    const path = value.split("/").map(encodeURIComponent).join("/");
    return `[${label}](${data.repo.htmlUrl}/blob/${branch}/${path})`;
  }
  if (/^https?:\/\//i.test(value)) return `[${label}](${value.replaceAll(" ", "%20")})`;
  return `[${label} (repository details)](${data.repo.htmlUrl})`;
}
