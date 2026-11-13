"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readSavedRepositories, SAVED_REPOSITORIES_KEY, type SavedScoreSnapshot } from "@/lib/analysis/local-history";
import { useLanguage } from "@/components/layout/language-provider";

export function SaveRepositoryButton({ repository, url, language, snapshot }: { repository: string; url: string; language: string | null; snapshot: SavedScoreSnapshot }) {
  const { text: t } = useLanguage();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedRepositories().some((item) => item.url === url));
  }, [url]);

  function save() {
    try {
      const current = readSavedRepositories();
      if (current.some((item) => item.url === url)) {
        setSaved(true);
        return;
      }
      window.localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify([
        { repository, url, language, savedAt: new Date().toISOString(), lastRefreshedAt: snapshot.analyzedAt, scoreHistory: [snapshot] },
        ...current,
      ]));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={save} disabled={saved}>
      {saved ? <BookmarkCheck aria-hidden="true" /> : <BookmarkPlus aria-hidden="true" />}
      {saved ? t("Saved on this device") : t("Save repository")}
    </Button>
  );
}
