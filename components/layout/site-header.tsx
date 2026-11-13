import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { GitHubIcon } from "./github-icon";
import { Button } from "@/components/ui/button";
import { PROJECT_REPO_URL } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <details className="relative sm:hidden">
            <summary aria-label="Toggle navigation menu" className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-input text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Menu aria-hidden="true" className="size-4" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 grid w-52 gap-1 rounded-xl border bg-card p-2 shadow-lg">
              <Link href="/" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Home</Link>
              <Link href="/#how-it-works" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">How It Works</Link>
              <Link href="/analyze" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Analyze Repository</Link>
              {PROJECT_REPO_URL && (
                <a href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">
                  RepoLens on GitHub
                </a>
              )}
            </div>
          </details>
          <Link href="/" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Home</Link>
          <Link href="/#how-it-works" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">How It Works</Link>
          {PROJECT_REPO_URL && (
            <Button asChild variant="ghost" size="icon">
              <a href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="RepoLens on GitHub">
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          )}
          <ThemeToggle />
          <Button asChild size="sm" className="ml-1">
            <Link href="/analyze">Analyze Repository</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
