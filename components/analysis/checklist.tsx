import type { CheckResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIcon, STATUS_LABEL } from "./status-icon";

export function Checklist({ checks }: { checks: CheckResult[] }) {
  const passed = checks.filter((c) => c.status === "pass").length;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Analysis checklist</CardTitle>
          <CardDescription>Each item shows the evidence RepoLens found.</CardDescription>
        </div>
        <Badge variant="muted" className="shrink-0 tabular-nums">{passed}/{checks.length} detected</Badge>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        <ul className="divide-y border-t">
          {checks.map((c) => (
            <li key={c.id} className="flex gap-3 px-5 py-4 sm:px-6">
              <StatusIcon status={c.status} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h3 className="font-medium">{c.label}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "pass" ? "success" : c.status === "fail" ? "danger" : "warning"}>{STATUS_LABEL[c.status]}</Badge>
                    <span className="w-14 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {c.status === "unknown" ? "?" : `+${c.points}`}/{c.maxPoints}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.evidence}</p>
                {c.matches.length > 0 && (
                  <ul className="mt-2 flex min-w-0 flex-wrap gap-1.5" aria-label={`${c.label} evidence`}>
                    {c.matches.map((m) => (
                      <li key={m} className="min-w-0 max-w-full truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground" title={m}>
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
