import type { Metadata } from "next";
import { AnalyzeView } from "@/components/analysis/analyze-view";

export const metadata: Metadata = { title: "Analyze a repository" };

export default async function AnalyzePage({ searchParams }: { searchParams: Promise<{ url?: string | string[]; view?: string }> }) {
  const { url, view } = await searchParams;
  const value = typeof url === "string" ? url : "";
  return <AnalyzeView key={`${value}-${view ?? "full"}`} url={value} checklistOnly={view === "checklist"} />;
}
