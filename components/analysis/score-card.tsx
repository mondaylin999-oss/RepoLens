import type { CheckResult, ScoreResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreBand } from "@/lib/analysis/scoring";
import { cn } from "@/lib/utils";

const BAND_COLOR = {
  excellent: "stroke-success text-success",
  good: "stroke-primary text-primary",
  fair: "stroke-warning text-warning",
  "needs-work": "stroke-danger text-danger",
} as const;

export function ScoreCard({ score, checks }: { score: ScoreResult; checks: CheckResult[] }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const value = score.score ?? score.earned;
  const band = score.score !== null ? scoreBand(score.score) : null;
  const color = band ? BAND_COLOR[band.band] : "stroke-warning text-warning";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness score</CardTitle>
        <CardDescription>Basic portfolio presentation — not code quality or security.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative size-44" role="img" aria-label={score.complete ? `Score ${score.score} out of 100` : `Incomplete: at least ${score.earned} of 100 points confirmed`}>
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
              {!score.complete && (
                <circle
                  cx="60" cy="60" r={r} fill="none" strokeWidth="10"
                  strokeDasharray={`${(c * score.unknownPoints) / 100} ${c}`}
                  strokeDashoffset={-(c * score.earned) / 100}
                  className="stroke-warning/35"
                />
              )}
              <circle
                cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(c * value) / 100} ${c}`}
                className={cn(color, "transition-[stroke-dasharray] duration-700 ease-out")}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {score.complete ? (
                <>
                  <span className={cn("text-5xl font-semibold tabular-nums tracking-tight", color)}>{score.score}</span>
                  <span className="text-xs text-muted-foreground">out of 100</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium uppercase tracking-wide text-warning">Incomplete</span>
                  <span className="text-3xl font-semibold tabular-nums">≥ {score.earned}</span>
                  <span className="text-xs text-muted-foreground">confirmed points</span>
                </>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-medium">
            {band ? band.label : `${score.unknownPoints} points couldn't be verified`}
          </p>
        </div>

        <ul className="mt-6 space-y-2.5" aria-label="Points by check">
          {checks.map((ch) => (
            <li key={ch.id} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="text-muted-foreground">{ch.label}</span>
                <span className="font-mono text-xs tabular-nums">
                  {ch.status === "unknown" ? "?" : ch.points}/{ch.maxPoints}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", ch.status === "pass" ? "bg-success" : ch.status === "unknown" ? "bg-warning/50" : "bg-transparent")}
                  style={{ width: ch.status === "fail" ? 0 : "100%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
