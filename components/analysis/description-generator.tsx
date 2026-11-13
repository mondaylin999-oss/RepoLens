"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { PortfolioDescription } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RepoMetadata } from "@/lib/types";
import { cleanDescription, localizeDescriptionDraft, PLACEHOLDERS, type DescriptionLanguage } from "@/lib/portfolio/generator";
import { useLanguage } from "@/components/layout/language-provider";

type Format = "short" | "portfolio" | "linkedin" | "caseStudy" | "website" | "resume";
type Audience = "recruiters" | "collaborators" | "clients";
type TextKey = `${Audience}-${Format}-${DescriptionLanguage}`;
type Fact = "project" | "overview" | "technology" | "demo" | "source";
type Tone = "direct" | "conversational" | "formal";
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
const AUDIENCE_LABELS_MY: Record<Audience, string> = {
  recruiters: "အလုပ်ခန့်သူများအတွက် Portfolio အကျဉ်းချုပ်",
  collaborators: "ပူးပေါင်းလုပ်ဆောင်သူများအတွက် ပရောဂျက်အကျဉ်းချုပ်",
  clients: "ဖောက်သည်များအတွက် ပရောဂျက်အကျဉ်းချုပ်",
};
const DESCRIPTION_LANGUAGE_STORAGE_KEY = "repolens-description-language";
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "recruiters", label: "Recruiters" },
  { id: "collaborators", label: "Collaborators" },
  { id: "clients", label: "Clients" },
];
const TONES: { id: Tone; label: string }[] = [
  { id: "direct", label: "Direct" },
  { id: "conversational", label: "Conversational" },
  { id: "formal", label: "Formal" },
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
  const { text: t, language: interfaceLanguage } = useLanguage();
  const [descriptionLanguage, setDescriptionLanguage] = useState<DescriptionLanguage>("en");
  const [hasSavedLanguagePreference, setHasSavedLanguagePreference] = useState(false);
  const [format, setFormat] = useState<Format>("portfolio");
  const [compareMode, setCompareMode] = useState(false);
  const [compareFormat, setCompareFormat] = useState<Format>("linkedin");
  const [audience, setAudience] = useState<Audience>("recruiters");
  const [tone, setTone] = useState<Tone>("direct");
  const [includedFacts, setIncludedFacts] = useState<Record<Fact, boolean>>({ project: true, overview: true, technology: true, demo: true, source: true });
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DESCRIPTION_LANGUAGE_STORAGE_KEY);
      if (saved === "en" || saved === "my") {
        setDescriptionLanguage(saved);
        setHasSavedLanguagePreference(true);
        return;
      }
    } catch {
      // The choice follows the interface language for this visit when storage is unavailable.
    }
    setDescriptionLanguage(interfaceLanguage);
    setHasSavedLanguagePreference(false);
  }, [interfaceLanguage]);
  useEffect(() => {
    if (!hasSavedLanguagePreference) return;
    try {
      window.localStorage.setItem(DESCRIPTION_LANGUAGE_STORAGE_KEY, descriptionLanguage);
    } catch {
      // The selected description language remains active for this visit.
    }
  }, [descriptionLanguage, hasSavedLanguagePreference]);

  const generatedInEnglish: Record<Format, string> = {
    short: `${repo.name}: ${cleanDescription(repo.description) ?? PLACEHOLDERS.overview}`,
    portfolio: description.portfolio,
    linkedin: description.linkedin,
    caseStudy: caseStudyDraft(repo),
    website: websiteSummary(repo),
    resume: resumeSummary(repo),
  };
  const generated: Record<Format, string> = descriptionLanguage === "my"
    ? Object.fromEntries(FORMATS.map((item) => [item.id, localizeDescriptionDraft(generatedInEnglish[item.id], "my", repo.name)])) as Record<Format, string>
    : generatedInEnglish;
  const [texts, setTexts] = useState<Record<TextKey, string>>(() => Object.fromEntries(
    AUDIENCES.flatMap((option) => FORMATS.flatMap((item) => (["en", "my"] as const).map((descriptionLang) => {
      const base = descriptionLang === "my" ? localizeDescriptionDraft(generatedInEnglish[item.id], "my", repo.name) : generatedInEnglish[item.id];
      const audienceLabel = descriptionLang === "my" ? AUDIENCE_LABELS_MY[option.id] : AUDIENCE_LABELS[option.id];
      return [`${option.id}-${item.id}-${descriptionLang}`, `${audienceLabel}\n\n${base}`];
    }))),
  ) as Record<TextKey, string>);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [copiedFormat, setCopiedFormat] = useState<Format | null>(null);

  const textKey: TextKey = `${audience}-${format}-${descriptionLanguage}`;
  const tonePrefix = tone === "direct" ? "" : descriptionLanguage === "my"
    ? tone === "conversational" ? `${repo.name} ပရောဂျက်၏ အကျဉ်းချုပ်။` : `တရားဝင် ပရောဂျက်အကျဉ်းချုပ်: ${repo.name}။`
    : tone === "conversational" ? `Here’s a quick overview of ${repo.name}.` : `Formal project summary: ${repo.name}.`;
  const getFormatText = (targetFormat: Format) => {
    const targetKey: TextKey = `${audience}-${targetFormat}-${descriptionLanguage}`;
    const base = filterFacts(texts[targetKey], repo, includedFacts);
    return tonePrefix ? `${tonePrefix}\n\n${base}` : base;
  };
  const text = getFormatText(format);
  const activeCompareFormat = compareFormat === format ? FORMATS.find((item) => item.id !== format)!.id : compareFormat;
  const compareKey: TextKey = `${audience}-${activeCompareFormat}-${descriptionLanguage}`;
  const compareBaseText = filterFacts(texts[compareKey], repo, includedFacts);
  const compareText = tonePrefix ? `${tonePrefix}\n\n${compareBaseText}` : compareBaseText;
  const sentences = text.split(/(?<=[.!?။])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
  const originalBaseText = `${descriptionLanguage === "my" ? AUDIENCE_LABELS_MY[audience] : AUDIENCE_LABELS[audience]}\n\n${generated[format]}`;
  const originalText = tonePrefix ? `${tonePrefix}\n\n${originalBaseText}` : originalBaseText;
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

  async function onCopyFormat(targetFormat: Format) {
    try {
      await navigator.clipboard.writeText(getFormatText(targetFormat));
      setCopiedFormat(targetFormat);
    } catch {
      setCopiedFormat(null);
      setCopy("failed");
    }
    setTimeout(() => setCopiedFormat(null), 2000);
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("Portfolio description")}</CardTitle>
          <CardDescription>{t("Generated from verified repository details only. Edit it freely before copying.")}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="description-language" className="mr-2 text-xs text-muted-foreground">{t("Generated description language")}</label>
            <select
              id="description-language"
              value={descriptionLanguage}
              onChange={(event) => {
                const next = event.target.value as DescriptionLanguage;
                setDescriptionLanguage(next);
                setHasSavedLanguagePreference(true);
              }}
              className="h-9 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="en">English</option>
              <option value="my">မြန်မာ</option>
            </select>
          </div>
          <div>
            <label htmlFor="description-audience" className="mr-2 text-xs text-muted-foreground">{t("Write for")}</label>
            <select id="description-audience" value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {AUDIENCES.map((option) => <option key={option.id} value={option.id}>{t(option.label)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="description-tone" className="mr-2 text-xs text-muted-foreground">{t("Tone")}</label>
            <select id="description-tone" value={tone} onChange={(event) => setTone(event.target.value as Tone)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {TONES.map((option) => <option key={option.id} value={option.id}>{t(option.label)}</option>)}
            </select>
          </div>
          <div role="tablist" aria-label={t("Description format")} className="inline-flex shrink-0 rounded-lg bg-muted p-1">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                id={`description-tab-${f.id}`}
                data-format-tab={f.id}
                role="tab"
                type="button"
                aria-selected={format === f.id}
                aria-controls="description-format-panel"
                tabIndex={format === f.id ? 0 : -1}
                onClick={() => setFormat(f.id)}
                onKeyDown={(event) => {
                  const currentIndex = FORMATS.findIndex((item) => item.id === f.id);
                  const nextIndex = event.key === "ArrowRight"
                    ? (currentIndex + 1) % FORMATS.length
                    : event.key === "ArrowLeft"
                      ? (currentIndex - 1 + FORMATS.length) % FORMATS.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? FORMATS.length - 1
                          : currentIndex;
                  if (nextIndex === currentIndex) return;
                  event.preventDefault();
                  const nextFormat = FORMATS[nextIndex];
                  setFormat(nextFormat.id);
                  event.currentTarget.parentElement
                    ?.querySelector<HTMLButtonElement>(`[data-format-tab="${nextFormat.id}"]`)
                    ?.focus();
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  format === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <fieldset className="mb-4 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">{t("Include verified facts")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FACTS.map((fact) => (
              <label key={fact.id} className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={includedFacts[fact.id]} onChange={(event) => setIncludedFacts((current) => ({ ...current, [fact.id]: event.target.checked }))} className="size-4 accent-primary" />
                {t(fact.label)}
              </label>
            ))}
          </div>
        </fieldset>
        {description.placeholders.length > 0 && (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-sm">
            {t("Some details aren't available on GitHub, so they're marked with")} <code className="font-mono">[brackets]</code>. {t("Replace them with your own words.")}
          </p>
        )}
        <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={compareMode} onChange={(event) => setCompareMode(event.target.checked)} className="size-4 accent-primary" />
          {t("Compare two formats side by side")}
        </label>
        {compareMode && (
          <label htmlFor="description-compare-format" className="mb-3 ml-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            {t("Compare with")}
            <select id="description-compare-format" value={activeCompareFormat} onChange={(event) => setCompareFormat(event.target.value as Format)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {FORMATS.filter((item) => item.id !== format).map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}
            </select>
          </label>
        )}
        <div className={compareMode ? "grid gap-4 lg:grid-cols-2" : ""}>
          <div id="description-format-panel" role="tabpanel" aria-labelledby={`description-tab-${format}`}>
            <label htmlFor="description-text" className="mb-1 block text-xs font-medium text-muted-foreground">{t(FORMATS.find((item) => item.id === format)?.label ?? "Portfolio entry")}</label>
            <Textarea
              id="description-text"
              value={text}
              onChange={(event) => setTexts((current) => ({ ...current, [textKey]: tonePrefix ? event.target.value.replace(`${tonePrefix}\n\n`, "") : event.target.value }))}
              rows={10}
            />
          </div>
          {compareMode && (
            <div>
              <label htmlFor="description-compare-text" className="mb-1 block text-xs font-medium text-muted-foreground">{t(FORMATS.find((item) => item.id === activeCompareFormat)?.label ?? "Portfolio entry")}</label>
              <Textarea
                id="description-compare-text"
                value={compareText}
                onChange={(event) => setTexts((current) => ({ ...current, [compareKey]: tonePrefix ? event.target.value.replace(`${tonePrefix}\n\n`, "") : event.target.value }))}
                rows={10}
              />
            </div>
          )}
        </div>
        <details className="mt-3 rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">{t("See source facts for each sentence")}</summary>
          <ol className="mt-3 space-y-3">
            {sentences.map((sentence, index) => (
              <li key={`${index}-${sentence}`} className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm">{sentence}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Source:")} {t(sourceFacts(sentence, repo))}</p>
              </li>
            ))}
          </ol>
        </details>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={onCopy}>
            {copy === "copied" ? <Check /> : <Copy />}
            {copy === "copied" ? t("Copied!") : t("Copy Description")}
          </Button>
          <Button variant="outline" disabled={!edited} onClick={() => {
            setTexts((t) => ({ ...t, [textKey]: originalBaseText }));
            setIncludedFacts({ project: true, overview: true, technology: true, demo: true, source: true });
          }}>
            <RotateCcw /> {t("Reset")}
          </Button>
          <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {copy === "copied" && t("Description copied to clipboard.")}
            {copy === "failed" && <span className="text-danger">{t("Couldn't access the clipboard — select the text and copy it manually.")}</span>}
          </span>
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Copy any format")}</p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((item) => (
              <Button key={item.id} type="button" variant="outline" size="sm" aria-label={`${t("Copy")} ${t(item.label)}`} onClick={() => onCopyFormat(item.id)}>
                {copiedFormat === item.id ? <Check /> : <Copy />}
                {copiedFormat === item.id ? t("Copied") : t(item.label)}
              </Button>
            ))}
          </div>
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
    if (!included.overview && (trimmed.startsWith("Overview:") || trimmed.startsWith("အကျဉ်းချုပ်:") || trimmed === "## Overview" || trimmed === "## အကျဉ်းချုပ်" || (overview && trimmed.includes(overview)))) return false;
    if (!included.technology && /^(Primary language:|အဓိက ပရိုဂရမ်းမင်းဘာသာစကား:|Technology:|နည်းပညာ:|Technologies and topics:|နည်းပညာနှင့် ခေါင်းစဉ်များ:|Topics:|ခေါင်းစဉ်များ:|Written primarily in|အဓိကအားဖြင့်|Repository metadata lists:|Repository metadata တွင် ဖော်ပြထားသော နည်းပညာများ:)/.test(trimmed)) return false;
    if (!included.demo && repo.homepage && trimmed.includes(repo.homepage)) return false;
    if (!included.source && trimmed.includes(repo.htmlUrl)) return false;
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sourceFacts(sentence: string, repo: RepoMetadata): string {
  const sources: string[] = [];
  if (sentence.includes(repo.name)) sources.push("repository name");
  const overview = cleanDescription(repo.description);
  if (overview && sentence.includes(overview)) sources.push("GitHub About description");
  if (repo.language && sentence.includes(repo.language)) sources.push("primary language metadata");
  const usedTopics = repo.topics.filter((topic) => sentence.toLowerCase().includes(topic.toLowerCase()));
  if (usedTopics.length) sources.push(`repository topics (${usedTopics.join(", ")})`);
  if (repo.homepage && sentence.includes(repo.homepage)) sources.push("GitHub website field");
  if (sentence.includes(repo.htmlUrl)) sources.push("repository URL");
  return sources.length ? sources.join(" · ") : sentence.includes("[") ? "editable placeholder" : "template wording";
}
