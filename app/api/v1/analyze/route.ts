import { NextResponse, type NextRequest } from "next/server";
import { handleAnalysisRequest } from "@/lib/analysis/api-handler";
import { recordApiMetric } from "@/lib/observability/api-metrics";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
  "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
};

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  try {
    const response = await handleAnalysisRequest(request);
    status = response.status;
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
    headers.set("X-API-Version", "1");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } finally {
    recordApiMetric("public-api-v1", status, startedAt);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
