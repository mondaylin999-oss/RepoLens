"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/layout/github-icon";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { cn } from "@/lib/utils";

interface Props {
  defaultValue?: string;
  size?: "lg" | "default";
  autoFocus?: boolean;
  busy?: boolean;
  className?: string;
}

const EXAMPLE_REPOSITORIES = [
  { type: "Personal project", name: "gaearon/overreacted.io", url: "https://github.com/gaearon/overreacted.io" },
  { type: "Fork", name: "aphrody-labs/swr", url: "https://github.com/aphrody-labs/swr" },
  { type: "Large repository", name: "vercel/next.js", url: "https://github.com/vercel/next.js" },
] as const;

export function RepoUrlForm({ defaultValue = "", size = "default", autoFocus, busy, className }: Props) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<(typeof EXAMPLE_REPOSITORIES)[number] | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseGitHubRepoUrl(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    router.push(`/analyze?url=${encodeURIComponent(parsed.value.normalizedUrl)}`);
  }

  const lg = size === "lg";
  return (
    <form onSubmit={onSubmit} noValidate className={cn("w-full", className)}>
      <label htmlFor={id} className="sr-only">GitHub repository URL</label>
      <div className={cn("flex flex-col gap-2 sm:flex-row", lg && "rounded-2xl border bg-card p-2 shadow-lg shadow-primary/5")}>
        <div className="relative flex-1">
          <GitHubIcon className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", lg ? "size-5" : "size-4")} />
          <Input
            id={id}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            placeholder="https://github.com/username/repository"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSelectedExample(null);
              if (error) setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn("pl-10", lg && "h-12 border-0 pl-11 text-base shadow-none focus-visible:ring-0 sm:text-[15px]")}
          />
        </div>
        <Button type="submit" size={lg ? "lg" : "default"} disabled={busy} className={cn(lg && "rounded-xl")}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Analyze Repository
          {!busy && <ArrowRight />}
        </Button>
      </div>
      <div className="mt-3 space-y-2 text-left">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">What we check:</span> README, project description, license,
          .gitignore, tests, CI, and live demo link. Each result includes its evidence.
        </p>
        <p className="text-xs font-medium text-muted-foreground">Try an example repository</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_REPOSITORIES.map((example) => (
            <Button
              key={example.type}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              aria-pressed={selectedExample?.url === example.url}
              onClick={() => {
                setValue(example.url);
                setError(null);
                setSelectedExample(example);
              }}
            >
              <span className="text-muted-foreground">{example.type}:</span>
              {example.name}
            </Button>
          ))}
        </div>
        {selectedExample && (
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {selectedExample.name} is a public {selectedExample.type.toLowerCase()}. Analyze it to see a readiness
            score and recommendations based on its public GitHub details and files. RepoLens won&apos;t change it.
          </p>
        )}
      </div>
      <p id={`${id}-error`} role="alert" className={cn("mt-2 min-h-5 text-sm text-danger", lg && "text-left")}>
        {error}
      </p>
    </form>
  );
}
