"use client";

import { useEffect, useState } from "react";
import { CircleHelp, ExternalLink, Eye, EyeOff, PartyPopper } from "lucide-react";
import type { Recommendation, RepoMetadata } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";
import { LicenseGoalPicker } from "./license-goal-picker";
import { RecommendationDone } from "./recommendation-done";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

const PRIORITY = {
  high: { label: "High impact", variant: "danger" },
  medium: { label: "Medium impact", variant: "warning" },
  low: { label: "Nice to have", variant: "muted" },
} as const;

const OFFICIAL_DOCS: Partial<Record<Recommendation["checkId"], { label: string; url: string }>> = {
  readme: { label: "About README files", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes" },
  description: { label: "About your repository", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-your-repository" },
  license: { label: "Licensing a repository", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository" },
  gitignore: { label: "Ignoring files", url: "https://docs.github.com/en/get-started/git-basics/ignoring-files" },
  tests: { label: "Build and test with GitHub Actions", url: "https://docs.github.com/en/actions/automating-builds-and-tests" },
  ci: { label: "GitHub Actions", url: "https://docs.github.com/en/actions" },
  demo: { label: "About your repository", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-your-repository" },
  topics: { label: "Classify your repository with topics", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics" },
};

export function RecommendationList({ recommendations, complete, repo }: { recommendations: Recommendation[]; complete: boolean; repo: RepoMetadata }) {
  const { text: t } = useLanguage();
  const storageKey = `repolens-hidden-recommendations:${repo.fullName}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      setHiddenIds(saved.filter((id) => recommendations.some((recommendation) => recommendation.checkId === id)));
    } catch {
      setHiddenIds([]);
    }
  }, [storageKey, recommendations]);

  function updateHidden(next: string[]) {
    setHiddenIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Hiding still works for the current page if storage is unavailable.
    }
  }

  const visibleRecommendations = recommendations.filter((recommendation) => !hiddenIds.includes(recommendation.checkId));
  const hiddenRecommendations = recommendations.filter((recommendation) => hiddenIds.includes(recommendation.checkId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Recommendations")}</CardTitle>
        <CardDescription>{t("Based only on what this analysis found, ordered by impact.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleRecommendations[0] && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Smallest next step")}</p>
            <p className="mt-1 font-medium">{t(visibleRecommendations[0].howToImprove[0])}</p>
            <a href={`#recommendation-${visibleRecommendations[0].checkId}`} className="mt-2 inline-block text-sm text-primary hover:underline">
              {t("See related recommendation:")} {t(visibleRecommendations[0].title)}
            </a>
          </div>
        )}
        {hiddenRecommendations.length > 0 && (
          <div className="mb-4 rounded-lg border border-dashed p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{hiddenRecommendations.length} {t(hiddenRecommendations.length === 1 ? "recommendation hidden" : "recommendations hidden")}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowHidden((current) => !current)}>
                {showHidden ? <EyeOff /> : <Eye />}
                {showHidden ? t("Hide hidden items") : t("Review hidden items")}
              </Button>
            </div>
            {showHidden && (
              <ul className="mt-3 space-y-2">
                {hiddenRecommendations.map((recommendation) => (
                  <li key={recommendation.checkId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{t(recommendation.title)}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => updateHidden(hiddenIds.filter((id) => id !== recommendation.checkId))}>
                      {t("Restore")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {!complete && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>{t("Unverified checks get no recommendation, because RepoLens couldn't confirm whether they're missing. Check those items in the repository yourself.")}</p>
          </div>
        )}
        {recommendations.length === 0 ? (
          complete ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm">
              <PartyPopper className="size-5 text-success" />
              <p>{t("Nothing to fix — this repository meets every readiness indicator RepoLens checks.")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("No improvements found among the checks that could be verified.")}</p>
          )
        ) : visibleRecommendations.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{t("All recommendations are hidden. You can restore them above.")}</p>
        ) : (
          <ol className="grid gap-4 md:grid-cols-2">
            {visibleRecommendations.map((r) => {
              const docs = OFFICIAL_DOCS[r.checkId];
              return (
              <li id={`recommendation-${r.checkId}`} key={r.checkId} className="scroll-mt-24 flex flex-col rounded-lg border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{t(r.title)}</h3>
                  <div className="flex gap-1.5">
                    <Badge variant={PRIORITY[r.priority].variant}>{t(PRIORITY[r.priority].label)}</Badge>
                    {r.potentialPoints > 0 && <Badge variant="default" className="font-mono">+{r.potentialPoints}</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => updateHidden([...hiddenIds, r.checkId])} aria-label={`${t("Hide")} ${t(r.title)}`}>
                    <EyeOff /> {t("Hide")}
                  </Button>
                  <RecommendationDone repoName={repo.fullName} recommendationId={r.checkId} title={r.title} />
                  <CopyButton value={r.howToImprove.map((step, index) => `${index + 1}. ${step}`).join("\n")} label="Copy steps" />
                  {r.checkId === "readme" && (
                    <CopyButton value={readmeOutline(repo)} label="Copy README outline" />
                  )}
                </div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("What's missing")}</dt>
                    <dd className="mt-0.5">{t(r.whatIsMissing)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Why it matters")}</dt>
                    <dd className="mt-0.5 text-muted-foreground">{t(r.whyItMatters)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("How to improve")}</dt>
                    <dd>
                      <ul className="mt-1 list-disc space-y-1 pl-4 marker:text-primary">
                        {r.howToImprove.map((step) => <li key={step}>{t(step)}</li>)}
                      </ul>
                    </dd>
                  </div>
                </dl>
                {docs && (
                  <a href={docs.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline">
                    {t("GitHub docs:")} {t(docs.label)}<ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                )}
                {r.checkId === "license" && <LicenseGoalPicker />}
              </li>
              );
            })}
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
