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

type Format = "short" | "portfolio" | "linkedin" | "caseStudy" | "website" | "resume";
type Audience = "recruiters" | "collaborators" | "clients";
type TextKey = `${Audience}-${Format}`;
type Fact = "project" | "overview" | "technology" | "demo" | "source";
const FACTS: { id: Fact; label: string }[] = [
  { id: "project", label: "Project name" },
  { id: "overview", label: "Overview" },
  { id: "technology", label: "Language and topics" },
  { id: "demo", label: "Live demo link" },
  { id: "source", label: "Source repository link" },
];
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
  { id: "website", label: "Personal website" },
  { id: "resume", label: "Résumé" },
];

export function DescriptionGenerator({ description, repo }: { description: PortfolioDescription; repo: RepoMetadata }) {
  const [format, setFormat] = useState<Format>("portfolio");
  const [audience, setAudience] = useState<Audience>("recruiters");
  const [includedFacts, setIncludedFacts] = useState<Record<Fact, boolean>>({ project: true, overview: true, technology: true, demo: true, source: true });
  const generated: Record<Format, string> = {
    short: `${repo.name}: ${cleanDescription(repo.description) ?? PLACEHOLDERS.overview}`,
    portfolio: description.portfolio,
    linkedin: description.linkedin,
    caseStudy: caseStudyDraft(repo),
    website: websiteSummary(repo),
    resume: resumeSummary(repo),
  };
  const [texts, setTexts] = useState<Record<TextKey, string>>(() => Object.fromEntries(
    AUDIENCES.flatMap((option) => FORMATS.map((item) => [`${option.id}-${item.id}`, `${AUDIENCE_LABELS[option.id]}\n\n${generated[item.id]}`])),
  ) as Record<TextKey, string>);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  const textKey: TextKey = `${audience}-${format}`;
  const text = filterFacts(texts[textKey], repo, includedFacts);
  const originalText = `${AUDIENCE_LABELS[audience]}\n\n${generated[format]}`;
  const allFactsIncluded = FACTS.every((fact) => includedFacts[fact.id]);
  const edited = texts[textKey] !== originalText || !allFactsIncluded;

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
        <fieldset className="mb-4 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Include verified facts</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FACTS.map((fact) => (
              <label key={fact.id} className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={includedFacts[fact.id]} onChange={(event) => setIncludedFacts((current) => ({ ...current, [fact.id]: event.target.checked }))} className="size-4 accent-primary" />
                {fact.label}
              </label>
            ))}
          </div>
        </fieldset>
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
          <Button variant="outline" disabled={!edited} onClick={() => {
            setTexts((t) => ({ ...t, [textKey]: originalText }));
            setIncludedFacts({ project: true, overview: true, technology: true, demo: true, source: true });
          }}>
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

function websiteSummary(repo: RepoMetadata): string {
  const lines = [repo.name, "", cleanDescription(repo.description) ?? PLACEHOLDERS.overview];
  const facts = [repo.language ? `Primary language: ${repo.language}.` : null, repo.topics.length ? `Topics: ${repo.topics.join(", ")}.` : null]
    .filter((fact): fact is string => Boolean(fact));
  if (facts.length) lines.push("", ...facts);
  if (repo.homepage) lines.push("", `Live demo: ${repo.homepage}`);
  lines.push("", `Source code: ${repo.htmlUrl}`);
  return lines.join("\n");
}

function resumeSummary(repo: RepoMetadata): string {
  const facts = [
    cleanDescription(repo.description) ?? PLACEHOLDERS.overview,
    repo.language ? `Primary language: ${repo.language}.` : null,
    repo.topics.length ? `Technologies and topics: ${repo.topics.join(", ")}.` : null,
    repo.homepage ? `Live demo: ${repo.homepage}` : null,
  ].filter(Boolean);
  return [`${repo.name} | ${repo.language ?? "Project"}`, ...facts.map((fact) => `• ${fact}`), `• Source: ${repo.htmlUrl}`].join("\n");
}

function filterFacts(text: string, repo: RepoMetadata, included: Record<Fact, boolean>): string {
  const overview = cleanDescription(repo.description);
  return text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!included.project && (trimmed === repo.name || trimmed === `# ${repo.name}` || trimmed.startsWith(`Project: ${repo.name}`) || trimmed.startsWith(`${repo.name} |`))) return false;
    if (!included.overview && (trimmed.startsWith("Overview:") || trimmed === "## Overview" || (overview && trimmed.includes(overview)))) return false;
    if (!included.technology && /^(Primary language:|Technology:|Technologies and topics:|Topics:|Written primarily in|Repository metadata lists:)/.test(trimmed)) return false;
    if (!included.demo && repo.homepage && trimmed.includes(repo.homepage)) return false;
    if (!included.source && trimmed.includes(repo.htmlUrl)) return false;
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
