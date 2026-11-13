"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/layout/github-icon";
import { useLanguage } from "@/components/layout/language-provider";
import { parseGitHubRepoUrl } from "@/lib/github/parser";
import { cn } from "@/lib/utils";
import { useGitHubToken } from "@/components/layout/github-token-provider";

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
  const { text: t } = useLanguage();
  const { token, setToken } = useGitHubToken();
  const router = useRouter();
  const id = useId();
  const tokenId = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<(typeof EXAMPLE_REPOSITORIES)[number] | null>(null);
  const [tokenDraft, setTokenDraft] = useState(token);

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
      <label htmlFor={id} className="sr-only">{t("GitHub repository URL")}</label>
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
            className={cn("pl-10 pr-10", lg && "h-12 border-0 pl-11 text-base shadow-none focus-visible:ring-0 sm:text-[15px]")}
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label={t("Clear repository URL")}
              className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
              onClick={() => {
                setValue("");
                setError(null);
                setSelectedExample(null);
                document.getElementById(id)?.focus();
              }}
            >
              <X />
            </Button>
          )}
        </div>
        <Button type="submit" size={lg ? "lg" : "default"} disabled={busy} className={cn(lg && "rounded-xl")}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {t("Analyze Repository")}
          {!busy && <ArrowRight />}
        </Button>
      </div>
      <div className="mt-3 space-y-2 text-left">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t("What we check:")}</span> {t("README, project description, license, .gitignore, tests, CI, and live demo link. Each result includes its evidence.")}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{t("Try an example repository")}</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_REPOSITORIES.map((example) => (
            <Button
              key={example.type}
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full whitespace-normal text-left [overflow-wrap:anywhere]"
              disabled={busy}
              aria-pressed={selectedExample?.url === example.url}
              onClick={() => {
                setValue(example.url);
                setError(null);
                setSelectedExample(example);
              }}
            >
              <span className="text-muted-foreground">{t(example.type)}:</span>
              {example.name}
            </Button>
          ))}
        </div>
        <details className="group rounded-lg border bg-card/70 px-3 py-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-foreground">
            <KeyRound aria-hidden="true" className="size-3.5 text-muted-foreground" />
            {t("Optional GitHub token")}
            <ChevronDown aria-hidden="true" className="ml-auto size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p id={`${tokenId}-help`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("A token is sent to RepoLens over HTTPS and forwarded to GitHub only for public repository API reads. It stays in this page's memory, is not saved by RepoLens, and should not have write access.")}</p>
          <label htmlFor={tokenId} className="mt-3 block text-xs font-medium">{t("Personal access token")}</label>
          <Input
            id={tokenId}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            aria-describedby={`${tokenId}-help`}
            placeholder={t("Paste a GitHub token")}
            className="mt-1 font-mono"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={!tokenDraft.trim() || tokenDraft.trim() === token} onClick={() => setToken(tokenDraft.trim())}>{t("Use for this session")}</Button>
            {token && <Button type="button" size="sm" variant="outline" onClick={() => { setToken(""); setTokenDraft(""); }}>{t("Clear token")}</Button>}
            {token && <span role="status" className="text-xs text-muted-foreground">{t("Token active for this session")}</span>}
          </div>
        </details>
        {selectedExample && (
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {selectedExample.name} {t("is a public")} {t(selectedExample.type.toLowerCase())}. {t("Analyze it to see a readiness score and recommendations based on its public GitHub details and files. RepoLens won't change it.")}
          </p>
        )}
      </div>
      <p id={`${id}-error`} role="alert" className={cn("mt-2 min-h-5 text-sm text-danger", lg && "text-left")}>
        {error ? t(error) : null}
      </p>
    </form>
  );
}
