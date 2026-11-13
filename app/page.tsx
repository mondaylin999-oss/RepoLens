import { BookOpenCheck, ClipboardList, FileText, Gauge, Link2, ListChecks, Sparkles } from "lucide-react";
import { RepoUrlForm } from "@/components/github/repo-url-form";
import { ThemePreview } from "@/components/layout/theme-preview";
import { FirstVisitGuide } from "@/components/layout/first-visit-guide";
import { RecentAnalyses } from "@/components/analysis/recent-analyses";
import { SavedRepositories } from "@/components/analysis/saved-repositories";
import { RepositoryComparison } from "@/components/analysis/repository-comparison";
import { CHECK_DEFINITIONS } from "@/lib/analysis/checks";

const STEPS = [
  { title: "Paste your repository URL", body: "Any public GitHub repository works — no sign-up and no GitHub login.", icon: Link2 },
  { title: "Get a readiness assessment", body: "RepoLens reads real data from the GitHub API and checks it against seven clear rules.", icon: Gauge },
  { title: "Improve with a checklist", body: "Follow specific recommendations based on what's actually missing from your repository.", icon: ListChecks },
];

const FEATURES = [
  { title: "Repository Readiness Score", body: "A 0–100 score where every point is backed by evidence you can see.", icon: Gauge },
  { title: "Documentation & Setup Checks", body: "README, description, license, .gitignore, tests, CI and demo link.", icon: BookOpenCheck },
  { title: "Actionable Improvement Checklist", body: "What's missing, why it matters and how to fix it — prioritized by impact.", icon: ClipboardList },
  { title: "Portfolio Description Generator", body: "An editable summary built only from your repository's verified details.", icon: FileText },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div aria-hidden className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-12 text-center max-[360px]:px-3 sm:px-6 sm:pb-24 sm:pt-24">
          <p className="animate-fade-up mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" /> Rule-based and transparent — no AI guesswork
          </p>
          <h1 className="animate-fade-up text-balance text-3xl font-semibold tracking-tight min-[360px]:text-4xl sm:text-6xl [animation-delay:60ms]">
            Is Your GitHub Repository <span className="text-primary">Portfolio-Ready?</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground [animation-delay:120ms]">
            Analyze your GitHub repository, discover what&apos;s missing, and learn how to make your projects stand out.
          </p>
          <div className="animate-fade-up mx-auto mt-10 max-w-2xl [animation-delay:180ms]">
            <RepoUrlForm size="lg" />
            <p className="-mt-1 text-sm text-muted-foreground">Free repository analysis. No sign-up required.</p>
          </div>
        </div>
      </section>

      <FirstVisitGuide />
      <RecentAnalyses />
      <SavedRepositories />
      <RepositoryComparison />
      <ThemePreview />

      <section id="how-it-works" className="scroll-mt-20 border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="How it works" title="Three steps to a stronger repository" />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground"><s.icon className="size-5" /></span>
                  <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Features" title="Everything you need to polish a project" align="left" />
            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <f.icon className="mb-3 size-5 text-primary" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h3 className="font-semibold">What we check</h3>
              <p className="text-sm text-muted-foreground">The exact scoring rules — nothing hidden.</p>
            </div>
            <ul className="divide-y">
              {CHECK_DEFINITIONS.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono text-muted-foreground">{c.maxPoints} pts</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-muted/50 px-5 py-3 text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono">{CHECK_DEFINITIONS.reduce((s, c) => s + c.maxPoints, 0)} pts</span>
              </li>
            </ul>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              The score measures basic portfolio presentation — not code quality or security.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl px-4 py-14 text-center max-[360px]:px-3 sm:px-6 sm:py-20">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">Check a repository now</h2>
          <p className="mt-3 text-muted-foreground">It takes a few seconds and works with any public repository.</p>
          <div className="mt-8"><RepoUrlForm /></div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}
