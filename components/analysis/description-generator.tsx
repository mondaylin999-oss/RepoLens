"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { PortfolioDescription } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Format = "portfolio" | "linkedin";
const FORMATS: { id: Format; label: string }[] = [
  { id: "portfolio", label: "Portfolio entry" },
  { id: "linkedin", label: "LinkedIn project" },
];

export function DescriptionGenerator({ description }: { description: PortfolioDescription }) {
  const [format, setFormat] = useState<Format>("portfolio");
  const [texts, setTexts] = useState<Record<Format, string>>({ portfolio: description.portfolio, linkedin: description.linkedin });
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  const text = texts[format];
  const edited = text !== description[format];

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
          onChange={(e) => setTexts((t) => ({ ...t, [format]: e.target.value }))}
          rows={10}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={onCopy}>
            {copy === "copied" ? <Check /> : <Copy />}
            {copy === "copied" ? "Copied!" : "Copy Description"}
          </Button>
          <Button variant="outline" disabled={!edited} onClick={() => setTexts((t) => ({ ...t, [format]: description[format] }))}>
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
