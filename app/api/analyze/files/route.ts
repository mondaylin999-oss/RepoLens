import { NextRequest, NextResponse } from "next/server";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { GitHubClient } from "@/lib/github/client";
import { getFileMatches } from "@/lib/analysis/checks";
import type { CheckId } from "@/lib/types";
import { readGitHubToken } from "@/lib/github/request-token";
import { recordApiMetric } from "@/lib/observability/api-metrics";

const FILE_CHECKS = new Set<CheckId>(["readme", "license", "gitignore", "tests", "ci"]);

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  try {
    const response = await handleFileListRequest(request);
    status = response.status;
    return response;
  } finally {
    recordApiMetric("analysis-files", status, startedAt);
  }
}

async function handleFileListRequest(request: NextRequest) {
  const parsed = parseGitHubRepoUrl(request.nextUrl.searchParams.get("url") ?? "");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const checkId = request.nextUrl.searchParams.get("check") as CheckId | null;
  if (!checkId || !FILE_CHECKS.has(checkId)) {
    return NextResponse.json({ error: "Choose a file-based check." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const requestToken = readGitHubToken(request);
  if (requestToken.invalid) {
    return NextResponse.json({ error: "That GitHub token format doesn't look right. Check it or clear it to continue without a token." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const client = new GitHubClient({ token: requestToken.token ?? (process.env.GITHUB_TOKEN || undefined) });
    const { owner, repo } = parsed.value;
    const metadata = await client.getRepository(owner, repo);
    const tree = await client.getTree(owner, repo, metadata);
    return NextResponse.json(
      { files: getFileMatches(checkId, { repo: metadata, tree }), complete: tree.status === "complete" },
      { headers: { "Cache-Control": requestToken.token || tree.status !== "complete" ? "no-store" : "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "The full file list could not be loaded. Please try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
