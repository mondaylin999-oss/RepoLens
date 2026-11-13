import Image from "next/image";
import { Archive, CalendarDays, CircleDot, Clock, ExternalLink, GitBranch, GitFork, Star } from "lucide-react";
import type { RepoMetadata } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDate, relativeTime } from "@/lib/utils";

export function RepoOverview({ repo }: { repo: RepoMetadata }) {
  const updated = repo.pushedAt ?? repo.updatedAt;
  const stats = [
    { label: "Stars", value: formatCount(repo.stars), icon: Star },
    { label: "Forks", value: formatCount(repo.forks), icon: GitFork },
    { label: "Open issues", value: formatCount(repo.openIssues), icon: CircleDot, hint: "Includes pull requests" },
    { label: "Last updated", value: relativeTime(updated) || "Unknown", icon: Clock, hint: formatDate(updated) },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
        <Image src={repo.ownerAvatarUrl} alt={`${repo.owner}'s avatar`} width={64} height={64} className="size-14 rounded-xl border sm:size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={repo.ownerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {repo.owner}
            </a>
            <span className="text-muted-foreground">/</span>
          </div>
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">
              {repo.name}
            </a>
            {repo.language && <Badge>{repo.language}</Badge>}
            <Badge variant="outline"><GitBranch className="size-3" />Branch: {repo.defaultBranch}</Badge>
            <Badge variant="muted"><CalendarDays className="size-3" />Created {relativeTime(repo.createdAt)}</Badge>
            {repo.archived && <Badge variant="warning"><Archive className="size-3" />Archived</Badge>}
            {repo.isFork && <Badge variant="muted"><GitFork className="size-3" />Fork</Badge>}
          </h2>
          <p className={repo.description ? "mt-2 text-pretty text-muted-foreground" : "mt-2 italic text-muted-foreground/70"}>
            {repo.description ?? "No description provided."}
          </p>
          {repo.topics.length > 0 && (
            <ul aria-label="Topics" className="mt-3 flex flex-wrap gap-1.5">
              {repo.topics.map((t) => (
                <li key={t}>
                  <a href={`https://github.com/topics/${encodeURIComponent(t)}`} target="_blank" rel="noopener noreferrer" aria-label={`Browse GitHub topic ${t}`}>
                    <Badge variant="outline" className="font-mono text-[11px] transition-colors hover:border-primary hover:text-primary">{t}</Badge>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 break-all font-mono text-xs text-primary hover:underline">
            {repo.htmlUrl.replace(/^https:\/\//, "")} <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} title={s.hint} className={`p-4 sm:px-6 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="size-3.5" />{s.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
