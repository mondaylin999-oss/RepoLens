import { LogoMark } from "./logo";
import { GitHubIcon } from "./github-icon";
import { PROJECT_REPO_URL } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="font-medium text-foreground">RepoLens</span>
          <span aria-hidden>·</span>
          <span>Make your GitHub projects portfolio-ready.</span>
        </div>
        <div className="flex items-center gap-4">
          {PROJECT_REPO_URL && (
            <a href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <GitHubIcon className="size-4" /> GitHub
            </a>
          )}
          <span className="rounded-full border px-2 py-0.5 font-mono text-xs">v1.0</span>
        </div>
      </div>
    </footer>
  );
}
