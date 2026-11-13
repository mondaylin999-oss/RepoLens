import type { CheckResult, ScoreResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreBand } from "@/lib/analysis/scoring";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";

const BAND_COLOR = {
  excellent: "stroke-success text-success",
  good: "stroke-primary text-primary",
  fair: "stroke-warning text-warning",
  "needs-work": "stroke-danger text-danger",
} as const;

export function ScoreCard({ score, checks }: { score: ScoreResult; checks: CheckResult[] }) {
  const { text: t } = useLanguage();
  const r = 52;
  const c = 2 * Math.PI * r;
  const value = score.score ?? score.earned;
  const band = score.score !== null ? scoreBand(score.score) : null;
  const color = band ? BAND_COLOR[band.band] : "stroke-warning text-warning";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Readiness score")}</CardTitle>
        <CardDescription>{t("Basic portfolio presentation — not code quality or security.")}</CardDescription>
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("What does this score mean?")}
          </summary>
          <p className="mt-2 text-muted-foreground">
            {t("It summarizes how ready this public repository looks to someone viewing it in a portfolio. Points come from seven visible checks, and each result includes evidence. Missing file data can make the score incomplete. It does not rate code quality or security.")}
          </p>
        </details>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative size-44" role="img" aria-label={score.complete
            ? `${t("Readiness score")}: ${score.score} ${t("out of 100")}. ${band ? t(band.label) : ""}`
            : `${t("Readiness score")}: ${t("Incomplete")}, ${t("at least")} ${score.earned} ${t("of 100 points confirmed")}`}>
            <svg aria-hidden="true" viewBox="0 0 120 120" className="size-full -rotate-90">
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
                  <span className="text-xs text-muted-foreground">{t("out of 100")}</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium uppercase tracking-wide text-warning">{t("Incomplete")}</span>
                  <span className="text-3xl font-semibold tabular-nums">≥ {score.earned}</span>
                  <span className="text-xs text-muted-foreground">{t("confirmed points")}</span>
                </>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-medium">
            {band ? t(band.label) : `${score.unknownPoints} ${t("points couldn't be verified")}`}
          </p>
        </div>

        <ul className="mt-6 space-y-2.5" aria-label={t("Points by check")}>
          {checks.map((ch) => (
            <li key={ch.id} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <a
                  href={`#check-${ch.id}`}
                  aria-label={`${t("Jump to")} ${t(ch.label)} ${t("check")}`}
                  className="rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(ch.label)}
                </a>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t(ch.status === "pass" ? "Detected" : ch.status === "fail" ? "Not found" : "Unverified")}</span>
                  <span className="font-mono tabular-nums">{ch.status === "unknown" ? "?" : ch.points}/{ch.maxPoints}</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t(ch.label)}
                aria-valuemin={0}
                aria-valuemax={ch.maxPoints}
                aria-valuenow={ch.status === "unknown" ? undefined : ch.points}
                aria-valuetext={ch.status === "unknown"
                  ? `${t("Unverified")}: ${t(`${ch.maxPoints} points unverified`)}`
                  : `${t(ch.status === "pass" ? "Detected" : "Not found")}: ${ch.points}/${ch.maxPoints} ${t("points")}`}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
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
