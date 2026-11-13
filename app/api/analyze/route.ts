import { NextResponse, type NextRequest } from "next/server";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { GitHubClient } from "@/lib/github/client";
import { GitHubError, HTTP_STATUS } from "@/lib/github/errors";
import { analyzeRepository } from "@/lib/analysis/analyze";
import type { AnalyzeResponse, ApiError } from "@/lib/types";
import { readGitHubToken } from "@/lib/github/request-token";
import { recordApiMetric } from "@/lib/observability/api-metrics";

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  try {
    const response = await handleAnalysisRequest(request);
    status = response.status;
    return response;
  } finally {
    recordApiMetric("analysis", status, startedAt);
  }
}

async function handleAnalysisRequest(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("url") ?? "";
  const parsed = parseGitHubRepoUrl(input);
  if (!parsed.ok) return errorResponse({ code: "INVALID_URL", message: parsed.error });

  const { owner, repo } = parsed.value;
  const requestToken = readGitHubToken(request);
  if (requestToken.invalid) {
    return errorResponse({ code: "INACCESSIBLE", message: "That GitHub token format doesn't look right. Check it or clear it to continue without a token." });
  }
  const client = new GitHubClient({ token: requestToken.token ?? (process.env.GITHUB_TOKEN || undefined) });

  try {
    const meta = await client.getRepository(owner, repo);
    const tree = await client.getTree(owner, repo, meta);
    const body: AnalyzeResponse = { ok: true, data: analyzeRepository(meta, tree) };
    return NextResponse.json(body, {
      headers: { "Cache-Control": requestToken.token || tree.status !== "complete" ? "no-store" : "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      return errorResponse({ code: err.code, message: err.message, retryAt: err.retryAt });
    }
    console.error("[api/analyze] unexpected error", { name: err instanceof Error ? err.name : "UnknownError" });
    return errorResponse({ code: "INTERNAL_ERROR", message: "Something went wrong while analyzing the repository. Please try again." });
  }
}

function errorResponse(error: ApiError) {
  const body: AnalyzeResponse = { ok: false, error };
  return NextResponse.json(body, { status: HTTP_STATUS[error.code], headers: { "Cache-Control": "no-store" } });
}
