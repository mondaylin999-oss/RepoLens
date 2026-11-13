import type { NextRequest } from "next/server";
import { handleAnalysisRequest } from "@/lib/analysis/api-handler";
import { recordApiMetric } from "@/lib/observability/api-metrics";

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  try {
    const response = await handleAnalysisRequest(request);
    status = response.status;
    return response;
  } finally {
    recordApiMetric("analysis", status, startedAt);
  }
}
