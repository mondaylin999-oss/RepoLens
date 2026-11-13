import { CircleHelp, PartyPopper } from "lucide-react";
import type { Recommendation, RepoMetadata } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";
import { LicenseGoalPicker } from "./license-goal-picker";

const PRIORITY = {
  high: { label: "High impact", variant: "danger" },
  medium: { label: "Medium impact", variant: "warning" },
  low: { label: "Nice to have", variant: "muted" },
} as const;

export function RecommendationList({ recommendations, complete, repo }: { recommendations: Recommendation[]; complete: boolean; repo: RepoMetadata }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <CardDescription>Based only on what this analysis found, ordered by impact.</CardDescription>
      </CardHeader>
      <CardContent>
        {!complete && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>Unverified checks get no recommendation, because RepoLens couldn&apos;t confirm whether they&apos;re missing. Check those items in the repository yourself.</p>
          </div>
        )}
        {recommendations.length === 0 ? (
          complete ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm">
              <PartyPopper className="size-5 text-success" />
              <p>Nothing to fix — this repository meets every readiness indicator RepoLens checks.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No improvements found among the checks that could be verified.</p>
          )
        ) : (
          <ol className="grid gap-4 md:grid-cols-2">
            {recommendations.map((r) => (
              <li key={r.checkId} className="flex flex-col rounded-lg border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  <div className="flex gap-1.5">
                    <Badge variant={PRIORITY[r.priority].variant}>{PRIORITY[r.priority].label}</Badge>
                    {r.potentialPoints > 0 && <Badge variant="default" className="font-mono">+{r.potentialPoints}</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton value={r.howToImprove.map((step, index) => `${index + 1}. ${step}`).join("\n")} label="Copy steps" />
                  {r.checkId === "readme" && (
                    <CopyButton value={readmeOutline(repo)} label="Copy README outline" />
                  )}
                </div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What&apos;s missing</dt>
                    <dd className="mt-0.5">{r.whatIsMissing}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why it matters</dt>
                    <dd className="mt-0.5 text-muted-foreground">{r.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How to improve</dt>
                    <dd>
                      <ul className="mt-1 list-disc space-y-1 pl-4 marker:text-primary">
                        {r.howToImprove.map((step) => <li key={step}>{step}</li>)}
                      </ul>
                    </dd>
                  </div>
                </dl>
                {r.checkId === "license" && <LicenseGoalPicker />}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function readmeOutline(repo: RepoMetadata): string {
  return [
    `# ${repo.name}`,
    "",
    repo.description ?? "[Describe what this project does and who it is for.]",
    "",
    "## Features",
    "- [Feature one]",
    "- [Feature two]",
    "",
    "## Getting started",
    "### Prerequisites",
    "- [Required runtime or tools]",
    "",
    "### Installation",
    "[Add installation steps]",
    "",
    "## Usage",
    "[Show a basic example]",
    "",
    "## Tests",
    "[Explain how to run the tests]",
    "",
    "## License",
    repo.license?.name ?? "[Add your license information]",
  ].join("\n");
}
