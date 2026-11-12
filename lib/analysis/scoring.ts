import type { CheckResult, ScoreResult } from "@/lib/types";

/**
 * Turns check results into a readiness score. When any check is "unknown", no definitive score is
 * produced — only the points confirmed so far — to avoid a misleading number.
 */
export function calculateScore(checks: CheckResult[]): ScoreResult {
  const possible = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const earned = checks.reduce((sum, c) => sum + (c.status === "pass" ? c.maxPoints : 0), 0);
  const unknownPoints = checks.reduce((sum, c) => sum + (c.status === "unknown" ? c.maxPoints : 0), 0);
  const complete = unknownPoints === 0;
  const score = complete ? (possible === 0 ? 0 : Math.round((earned / possible) * 100)) : null;
  return { score, earned, possible, unknownPoints, complete };
}

export type ScoreBand = "excellent" | "good" | "fair" | "needs-work";

export function scoreBand(score: number): { band: ScoreBand; label: string } {
  if (score >= 85) return { band: "excellent", label: "Portfolio-ready" };
  if (score >= 65) return { band: "good", label: "Almost there" };
  if (score >= 40) return { band: "fair", label: "Needs some polish" };
  return { band: "needs-work", label: "Needs work" };
}
