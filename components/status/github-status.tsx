"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CheckCircle2, Clock3, RefreshCw, TriangleAlert, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/layout/language-provider";

interface StatusItem {
  name: string;
  status: string;
  impact?: string;
  description?: string | null;
  updatedAt?: string;
  scheduledFor?: string;
  url?: string;
}

interface StatusData {
  status: { indicator: string; description: string };
  updatedAt: string | null;
  components: StatusItem[];
  incidents: StatusItem[];
  scheduledMaintenances: StatusItem[];
}

const STATUS_API = "/api/status/github";
const OFFICIAL_STATUS_URL = "https://www.githubstatus.com/";

export function GitHubStatus() {
  const { text: t, language } = useLanguage();
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(STATUS_API, { signal });
      const body = (await response.json()) as StatusData | { error?: string };
      if (!response.ok || !("status" in body)) throw new Error("status-unavailable");
      setData(body);
      setError(false);
    } catch {
      if (signal?.aborted) return;
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the async fetch on mount; it updates UI only after the external request resolves.
    void loadStatus(controller.signal);
    const interval = window.setInterval(() => void loadStatus(), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadStatus, refresh]);

  const dateLocale = language === "my" ? "my-MM" : "en-US";
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString(dateLocale) : null;
  const indicator = data?.status.indicator ?? "unknown";
  const tone = indicator === "none" ? "success" : indicator === "minor" || indicator === "maintenance" ? "warning" : indicator === "unknown" ? "muted" : "danger";
  const ToneIcon = indicator === "none" ? CheckCircle2 : indicator === "maintenance" ? Wrench : indicator === "unknown" ? Activity : TriangleAlert;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">{t("Back to RepoLens")}</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("GitHub service status")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("Check whether GitHub is reporting an API incident before retrying a repository analysis.")}</p>
        </div>
        <Button variant="outline" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} /> {t("Refresh status")}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-muted text-muted-foreground"}`}>
            <ToneIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle>{loading && !data ? t("Loading GitHub status…") : error && !data ? t("Live status is unavailable") : t(data?.status.description ?? "GitHub status is unknown")}</CardTitle>
            <CardDescription className="mt-1">
              {data?.updatedAt ? `${t("Last updated by GitHub")}: ${formatDate(data.updatedAt)}` : t("Status information is provided by GitHub.")}
            </CardDescription>
          </div>
        </CardHeader>
        {error && (
          <CardContent className="border-t pt-4 text-sm text-muted-foreground">
            <p>{t("RepoLens could not reach GitHub’s status feed. Open the official status page for the latest information.")}</p>
          </CardContent>
        )}
      </Card>

      {data && (
        <>
          {data.incidents.length > 0 && <StatusSection title="Active incidents" items={data.incidents} formatDate={formatDate} t={t} />}
          {data.scheduledMaintenances.length > 0 && <StatusSection title="Scheduled maintenance" items={data.scheduledMaintenances} formatDate={formatDate} t={t} />}

          <section className="mt-7">
            <h2 className="mb-3 text-lg font-semibold">{t("GitHub services")}</h2>
            <div className="divide-y rounded-xl border bg-card">
              {data.components.map((component) => (
                <div key={component.name} className="flex items-start gap-3 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl sm:px-5">
                  <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${component.status === "operational" ? "bg-success" : component.status === "degraded_performance" ? "bg-warning" : "bg-danger"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t(component.name)}</p>
                    {component.description && <p className="mt-0.5 text-sm text-muted-foreground">{t(component.description)}</p>}
                  </div>
                  <span className="shrink-0 text-right text-xs font-medium text-muted-foreground">{t(statusLabel(component.status))}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />{t("Status refreshes automatically every minute.")}</p>
        <a href={OFFICIAL_STATUS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          {t("Open GitHub status page")} <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </div>
  );
}

function StatusSection({ title, items, formatDate, t }: {
  title: string;
  items: StatusItem[];
  formatDate: (value?: string) => string | null;
  t: (value: string) => string;
}) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-lg font-semibold">{t(title)}</h2>
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={`${item.name}-${index}`}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{[item.impact && t(item.impact), item.status && t(statusLabel(item.status)), formatDate(item.updatedAt ?? item.scheduledFor)].filter(Boolean).join(" · ")}</CardDescription>
            </CardHeader>
            {item.url && <CardContent className="-mt-3"><a className="text-sm text-primary hover:underline" href={item.url} target="_blank" rel="noopener noreferrer">{t("View incident updates")} <ArrowUpRight aria-hidden="true" className="inline size-3.5" /></a></CardContent>}
          </Card>
        ))}
      </div>
    </section>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    operational: "Operational",
    degraded_performance: "Degraded performance",
    partial_outage: "Partial outage",
    major_outage: "Major outage",
    under_maintenance: "Under maintenance",
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
    resolved: "Resolved",
    scheduled: "Scheduled",
    in_progress: "In progress",
    verifying: "Verifying",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}
