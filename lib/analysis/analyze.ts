import type { AnalysisResult, RepoMetadata, RepoTree } from "@/lib/types";
import { runChecks } from "./checks";
import { calculateScore } from "./scoring";
import { generateRecommendations } from "./recommendations";
import { generatePortfolioDescription } from "@/lib/portfolio/generator";

/** Pure orchestration of the analysis pipeline — no network access, fully testable. */
export function analyzeRepository(repo: RepoMetadata, tree: RepoTree, now: Date = new Date()): AnalysisResult {
  const checks = runChecks({ repo, tree });
  return {
    repo,
    checks,
    score: calculateScore(checks),
    recommendations: generateRecommendations(repo, checks),
    description: generatePortfolioDescription(repo),
    tree: { status: tree.status, fileCount: tree.paths.length, reason: tree.reason },
    analyzedAt: now.toISOString(),
  };
}
