type MonitoredEndpoint = "analysis" | "analysis-files" | "public-api-v1";

/** Writes a compact metric to the hosting provider's runtime logs without request data. */
export function recordApiMetric(endpoint: MonitoredEndpoint, status: number, startedAt: number) {
  if (process.env.NODE_ENV !== "production") return;

  console.info(JSON.stringify({
    event: "repolens.api.request",
    endpoint,
    status,
    durationMs: Math.round(performance.now() - startedAt),
  }));
}
