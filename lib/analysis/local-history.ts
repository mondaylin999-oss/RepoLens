export const HISTORY_ENABLED_KEY = "repolens-save-history-enabled";
export const ANALYSIS_HISTORY_KEY = "repolens-analysis-history";

export interface LocalAnalysisHistoryEntry {
  repository: string;
  url: string;
  score: number | null;
  earned: number;
  complete: boolean;
  analyzedAt: string;
}

export function readAnalysisHistory(): LocalAnalysisHistoryEntry[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(ANALYSIS_HISTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value as LocalAnalysisHistoryEntry[] : [];
  } catch {
    return [];
  }
}
