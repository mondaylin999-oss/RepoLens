"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Beaker, Loader2 } from "lucide-react";
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

const SAMPLE_REPOSITORY_URL = "https://github.com/vercel/next.js";

export function RepoUrlForm({ defaultValue = "", size = "default", autoFocus, busy, className }: Props) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [sampleSelected, setSampleSelected] = useState(false);

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
              setSampleSelected(false);
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
      <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            setValue(SAMPLE_REPOSITORY_URL);
            setError(null);
            setSampleSelected(true);
          }}
        >
          <Beaker />
          Try a sample repository
        </Button>
        {sampleSelected && (
          <p role="status" aria-live="polite" className="text-left text-xs text-muted-foreground">
            This public Next.js repository is a demo. Analyzing it reads public GitHub details and files to
            calculate a readiness score and suggest improvements. It won&apos;t change the repository.
          </p>
        )}
      </div>
      <p id={`${id}-error`} role="alert" className={cn("mt-2 min-h-5 text-sm text-danger", lg && "text-left")}>
        {error}
      </p>
    </form>
  );
}
