import { NextResponse, type NextRequest } from "next/server";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { GitHubClient } from "@/lib/github/client";
import { GitHubError, HTTP_STATUS } from "@/lib/github/errors";
import { analyzeRepository } from "@/lib/analysis/analyze";
import type { AnalyzeResponse, ApiError } from "@/lib/types";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("url") ?? "";
  const parsed = parseGitHubRepoUrl(input);
  if (!parsed.ok) return errorResponse({ code: "INVALID_URL", message: parsed.error });

  const { owner, repo } = parsed.value;
  const client = new GitHubClient({ token: process.env.GITHUB_TOKEN || undefined });

  try {
    const meta = await client.getRepository(owner, repo);
    const tree = await client.getTree(owner, repo, meta);
    const body: AnalyzeResponse = { ok: true, data: analyzeRepository(meta, tree) };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      return errorResponse({ code: err.code, message: err.message, retryAt: err.retryAt });
    }
    console.error("[api/analyze] unexpected error", err);
    return errorResponse({ code: "INTERNAL_ERROR", message: "Something went wrong while analyzing the repository. Please try again." });
  }
}

function errorResponse(error: ApiError) {
  const body: AnalyzeResponse = { ok: false, error };
  return NextResponse.json(body, { status: HTTP_STATUS[error.code], headers: { "Cache-Control": "no-store" } });
}
