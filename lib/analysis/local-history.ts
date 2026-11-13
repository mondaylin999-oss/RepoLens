export const HISTORY_ENABLED_KEY = "repolens-save-history-enabled";
export const ANALYSIS_HISTORY_KEY = "repolens-analysis-history";
export const SAVED_REPOSITORIES_KEY = "repolens-saved-repositories";
export const ACCOUNT_SYNC_ENABLED_KEY = "repolens-account-history-sync-enabled";
export const ACCOUNT_SAVED_REPOSITORIES_SYNC_KEY = "repolens-account-saved-repositories-sync-enabled";
export const SAVED_REPOSITORIES_CHANGE_EVENT = "repolens-saved-repositories-change";

export function notifySavedRepositoriesChanged(action: "upsert" | "remove", url?: string) {
  window.dispatchEvent(new CustomEvent(SAVED_REPOSITORIES_CHANGE_EVENT, { detail: { action, url } }));
}

export interface LocalAnalysisHistoryEntry {
  repository: string;
  url: string;
  score: number | null;
  earned: number;
  complete: boolean;
  analyzedAt: string;
}

export interface SavedRepository {
  repository: string;
  url: string;
  language?: string | null;
  savedAt: string;
  lastRefreshedAt?: string;
  scoreHistory?: SavedScoreSnapshot[];
}

export interface SavedScoreSnapshot {
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

export function readSavedRepositories(): SavedRepository[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_REPOSITORIES_KEY) ?? "[]");
    return Array.isArray(value) ? value as SavedRepository[] : [];
  } catch {
    return [];
  }
}
