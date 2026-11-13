import { NextResponse } from "next/server";

const GITHUB_STATUS_URL = "https://www.githubstatus.com/api/v2/summary.json";

interface StatusSummary {
  page?: { name?: string; updated_at?: string };
  status?: { indicator?: string; description?: string };
  components?: { name?: string; status?: string; description?: string | null }[];
  incidents?: { name?: string; status?: string; impact?: string; updated_at?: string; shortlink?: string }[];
  scheduled_maintenances?: { name?: string; status?: string; impact?: string; scheduled_for?: string; shortlink?: string }[];
}

export async function GET() {
  try {
    const response = await fetch(GITHUB_STATUS_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("GitHub status is temporarily unavailable.");

    const summary = (await response.json()) as StatusSummary;
    if (!summary.status || !Array.isArray(summary.components)) {
      throw new Error("GitHub returned an unexpected status response.");
    }

    return NextResponse.json(
      {
        status: summary.status,
        updatedAt: summary.page?.updated_at ?? null,
        components: summary.components
          .filter((item) => item.name && item.status)
          .map(({ name, status, description }) => ({ name, status, description: description ?? null })),
        incidents: (summary.incidents ?? []).map(({ name, status, impact, updated_at, shortlink }) => ({ name, status, impact, updatedAt: updated_at, url: shortlink })),
        scheduledMaintenances: (summary.scheduled_maintenances ?? []).map(({ name, status, impact, scheduled_for, shortlink }) => ({ name, status, impact, scheduledFor: scheduled_for, url: shortlink })),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json(
      { error: "GitHub's live status could not be loaded." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
