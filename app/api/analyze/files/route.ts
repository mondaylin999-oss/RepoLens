import { NextRequest, NextResponse } from "next/server";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { GitHubClient } from "@/lib/github/client";
import { getFileMatches } from "@/lib/analysis/checks";
import type { CheckId } from "@/lib/types";

const FILE_CHECKS = new Set<CheckId>(["readme", "license", "gitignore", "tests", "ci"]);

export async function GET(request: NextRequest) {
  const parsed = parseGitHubRepoUrl(request.nextUrl.searchParams.get("url") ?? "");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const checkId = request.nextUrl.searchParams.get("check") as CheckId | null;
  if (!checkId || !FILE_CHECKS.has(checkId)) {
    return NextResponse.json({ error: "Choose a file-based check." }, { status: 400 });
  }

  try {
    const client = new GitHubClient({ token: process.env.GITHUB_TOKEN || undefined });
    const { owner, repo } = parsed.value;
    const metadata = await client.getRepository(owner, repo);
    const tree = await client.getTree(owner, repo, metadata);
    return NextResponse.json(
      { files: getFileMatches(checkId, { repo: metadata, tree }), complete: tree.status === "complete" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "The full file list could not be loaded. Please try again." }, { status: 502 });
  }
}
