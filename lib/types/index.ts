/** Shared types for RepoLens. Kept framework-agnostic so they can be reused by a future database layer. */

export type CheckId = "readme" | "description" | "license" | "gitignore" | "tests" | "ci" | "demo";

/** pass = evidence found, fail = verified absent, unknown = could not be determined (e.g. truncated tree). */
export type CheckStatus = "pass" | "fail" | "unknown";

export interface CheckResult {
  id: CheckId;
  label: string;
  status: CheckStatus;
  points: number;
  maxPoints: number;
  /** Human-readable explanation of what was (or was not) found. */
  evidence: string;
  /** Example paths or values backing the evidence. */
  matches: string[];
}

export interface RepoMetadata {
  owner: string;
  ownerAvatarUrl: string;
  ownerUrl: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  htmlUrl: string;
  homepage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  defaultBranch: string;
  license: { spdxId: string | null; name: string } | null;
  archived: boolean;
  isFork: boolean;
  sizeKb: number;
}

export type TreeStatus = "complete" | "truncated" | "unavailable";

export interface RepoTree {
  status: TreeStatus;
  /** Blob (file) paths relative to the repository root. */
  paths: string[];
  /** Why the tree is not complete, if applicable. */
  reason?: string;
}

export interface ScoreResult {
  /** Final score, or null when analysis is incomplete and a definitive score would be misleading. */
  score: number | null;
  earned: number;
  possible: number;
  /** Points belonging to checks whose status is unknown. */
  unknownPoints: number;
  complete: boolean;
}

export type RecommendationPriority = "high" | "medium" | "low";

export interface Recommendation {
  checkId: CheckId | "topics";
  priority: RecommendationPriority;
  title: string;
  whatIsMissing: string;
  whyItMatters: string;
  howToImprove: string[];
  /** Points that would be gained if fixed (0 for unscored suggestions). */
  potentialPoints: number;
}

export interface PortfolioDescription {
  portfolio: string;
  linkedin: string;
  /** Fields that were missing and replaced with editable placeholders. */
  placeholders: string[];
}

export interface AnalysisResult {
  repo: RepoMetadata;
  checks: CheckResult[];
  score: ScoreResult;
  recommendations: Recommendation[];
  description: PortfolioDescription;
  tree: { status: TreeStatus; fileCount: number; reason?: string };
  analyzedAt: string;
}

export type AnalysisErrorCode =
  | "INVALID_URL"
  | "NOT_FOUND"
  | "INACCESSIBLE"
  | "EMPTY_REPOSITORY"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: AnalysisErrorCode;
  message: string;
  /** ISO timestamp when a rate limit resets, if known. */
  retryAt?: string;
}

export type AnalyzeResponse = { ok: true; data: AnalysisResult } | { ok: false; error: ApiError };
