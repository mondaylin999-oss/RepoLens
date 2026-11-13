"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIcon, STATUS_LABEL } from "./status-icon";

export function Checklist({
  checks,
  repoUrl,
  defaultBranch,
  fileCount,
  treeStatus,
}: {
  checks: CheckResult[];
  repoUrl: string;
  defaultBranch: string;
  fileCount: number;
  treeStatus: "complete" | "truncated" | "unavailable";
}) {
  const passed = checks.filter((c) => c.status === "pass").length;
  const treeStatusLabel = treeStatus === "complete" ? "complete file list" : treeStatus === "truncated" ? "partial file list" : "file list unavailable";
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Analysis checklist</CardTitle>
          <CardDescription>
            {fileCount.toLocaleString()} files returned · {treeStatusLabel}. File-based checks use this list. Each item shows its evidence.
            Test files are detected, but RepoLens does not run them.
          </CardDescription>
        </div>
        <Badge variant="muted" className="shrink-0 tabular-nums">{passed}/{checks.length} detected</Badge>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        <ul className="divide-y border-t">
          {checks.map((c) => (
            <li id={`check-${c.id}`} key={c.id} className="scroll-mt-24 flex gap-3 px-5 py-4 sm:px-6">
              <StatusIcon status={c.status} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h3 className="font-medium">{c.label}</h3>
                  <div className="flex items-center gap-2">
                    <Badge aria-label={`${c.label}: ${STATUS_LABEL[c.status]}`} variant={c.status === "pass" ? "success" : c.status === "fail" ? "danger" : "warning"}>{STATUS_LABEL[c.status]}</Badge>
                    <span className="w-14 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {c.status === "unknown" ? "?" : `+${c.points}`}/{c.maxPoints}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.evidence}</p>
                {c.matches.length > 0 && (
                  <ul className="mt-2 flex min-w-0 flex-wrap gap-1.5" aria-label={`${c.label} evidence`}>
                    {c.matches.map((m) => (
                      <li key={m} className="min-w-0 max-w-full truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground" title={m}>
                        {isFileEvidence(c.id, m) ? (
                          <FileLink repoUrl={repoUrl} defaultBranch={defaultBranch} path={m} />
                        ) : m}
                      </li>
                    ))}
                  </ul>
                )}
                {c.matches.length > 0 && isExpandableCheck(c.id) && (
                  <ExpandedFiles check={c} repoUrl={repoUrl} defaultBranch={defaultBranch} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function isFileEvidence(checkId: CheckResult["id"], match: string): boolean {
  if (checkId === "license") return /^(licen[sc]e|copying|unlicense)([-._][A-Za-z0-9.+-]*)?$/i.test(match);
  return checkId === "readme" || checkId === "gitignore" || checkId === "tests" || checkId === "ci";
}

function isExpandableCheck(checkId: CheckResult["id"]): boolean {
  return checkId === "readme" || checkId === "license" || checkId === "gitignore" || checkId === "tests" || checkId === "ci";
}

function FileLink({ repoUrl, defaultBranch, path }: { repoUrl: string; defaultBranch: string; path: string }) {
  const href = `${repoUrl}/blob/${defaultBranch.split("/").map(encodeURIComponent).join("/")}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">{path}</a>;
}

function ExpandedFiles({ check, repoUrl, defaultBranch }: { check: CheckResult; repoUrl: string; defaultBranch: string }) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [complete, setComplete] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFiles() {
    if (files) {
      setExpanded((current) => !current);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ url: repoUrl, check: check.id });
      const response = await fetch(`/api/analyze/files?${params.toString()}`);
      const body = (await response.json()) as { files?: string[]; complete?: boolean; error?: string };
      if (!response.ok || !body.files) throw new Error(body.error || "The full file list could not be loaded.");
      setFiles(body.files);
      setComplete(body.complete ?? false);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The full file list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={toggleFiles} disabled={loading} aria-expanded={expanded} aria-busy={loading} className="text-xs font-medium text-primary hover:underline disabled:opacity-60">
        {loading ? "Loading files…" : expanded ? "Hide full file list" : "Show all matching files"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      {expanded && files && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">{files.length.toLocaleString()} matching files{complete ? "" : " · partial list from GitHub"}</p>
          <ul className="mt-1 max-h-56 space-y-1 overflow-auto rounded-lg border bg-background p-2" aria-label={`All matching ${check.label} files`}>
            {files.map((file) => (
              <li key={file} className="truncate font-mono text-xs" title={file}>
                <FileLink repoUrl={repoUrl} defaultBranch={defaultBranch} path={file} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
