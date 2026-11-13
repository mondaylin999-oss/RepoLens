"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { PortfolioDescription } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RepoMetadata } from "@/lib/types";
import { cleanDescription, PLACEHOLDERS } from "@/lib/portfolio/generator";

type Format = "short" | "portfolio" | "linkedin" | "caseStudy";
type Audience = "recruiters" | "collaborators" | "clients";
type TextKey = `${Audience}-${Format}`;
const AUDIENCE_LABELS: Record<Audience, string> = {
  recruiters: "Portfolio summary for recruiters",
  collaborators: "Project overview for collaborators",
  clients: "Project overview for clients",
};
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "recruiters", label: "Recruiters" },
  { id: "collaborators", label: "Collaborators" },
  { id: "clients", label: "Clients" },
];
const FORMATS: { id: Format; label: string }[] = [
  { id: "short", label: "One sentence" },
  { id: "portfolio", label: "Portfolio entry" },
  { id: "linkedin", label: "LinkedIn project" },
  { id: "caseStudy", label: "Case study" },
];

export function DescriptionGenerator({ description, repo }: { description: PortfolioDescription; repo: RepoMetadata }) {
  const [format, setFormat] = useState<Format>("portfolio");
  const [audience, setAudience] = useState<Audience>("recruiters");
  const generated: Record<Format, string> = {
    short: `${repo.name}: ${cleanDescription(repo.description) ?? PLACEHOLDERS.overview}`,
    portfolio: description.portfolio,
    linkedin: description.linkedin,
    caseStudy: caseStudyDraft(repo),
  };
  const [texts, setTexts] = useState<Record<TextKey, string>>(() => Object.fromEntries(
    AUDIENCES.flatMap((option) => FORMATS.map((item) => [`${option.id}-${item.id}`, `${AUDIENCE_LABELS[option.id]}\n\n${generated[item.id]}`])),
  ) as Record<TextKey, string>);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  const textKey: TextKey = `${audience}-${format}`;
  const text = texts[textKey];
  const originalText = `${AUDIENCE_LABELS[audience]}\n\n${generated[format]}`;
  const edited = text !== originalText;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    setTimeout(() => setCopy("idle"), 2000);
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Portfolio description</CardTitle>
          <CardDescription>Generated from verified repository details only. Edit it freely before copying.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="description-audience" className="mr-2 text-xs text-muted-foreground">Write for</label>
            <select id="description-audience" value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {AUDIENCES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div role="tablist" aria-label="Description format" className="inline-flex shrink-0 rounded-lg bg-muted p-1">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={format === f.id}
                aria-controls="description-text"
                onClick={() => setFormat(f.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  format === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {description.placeholders.length > 0 && (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-sm">
            Some details aren&apos;t available on GitHub, so they&apos;re marked with <code className="font-mono">[brackets]</code>. Replace them with your own words.
          </p>
        )}
        <label htmlFor="description-text" className="sr-only">Portfolio description text</label>
        <Textarea
          id="description-text"
          role="tabpanel"
          value={text}
          onChange={(e) => setTexts((t) => ({ ...t, [textKey]: e.target.value }))}
          rows={10}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={onCopy}>
            {copy === "copied" ? <Check /> : <Copy />}
            {copy === "copied" ? "Copied!" : "Copy Description"}
          </Button>
          <Button variant="outline" disabled={!edited} onClick={() => setTexts((t) => ({ ...t, [textKey]: originalText }))}>
            <RotateCcw /> Reset
          </Button>
          <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {copy === "copied" && "Description copied to clipboard."}
            {copy === "failed" && <span className="text-danger">Couldn&apos;t access the clipboard — select the text and copy it manually.</span>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function caseStudyDraft(repo: RepoMetadata): string {
  const technologies = [repo.language, ...repo.topics.filter((topic) => topic.toLowerCase() !== repo.language?.toLowerCase())].filter(Boolean);
  const lines = [
    `# ${repo.name}`,
    "",
    "## Overview",
    cleanDescription(repo.description) ?? PLACEHOLDERS.overview,
    "",
    "## Context and goal",
    "[Describe the problem, intended audience, and project goals.]",
    "",
    "## Approach",
    technologies.length ? `Repository metadata lists: ${technologies.join(", ")}. [Explain your design and implementation choices.]` : "[Describe your approach and the technologies you chose.]",
    "",
    "## Results",
    "[Add verified outcomes, what you learned, and any limitations.]",
    "",
    "## Links",
  ];
  if (repo.homepage) lines.push(`Demo: ${repo.homepage}`);
  lines.push(`Source: ${repo.htmlUrl}`);
  return lines.join("\n");
}
