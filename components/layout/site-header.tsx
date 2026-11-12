import Link from "next/link";
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
