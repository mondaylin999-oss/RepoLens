"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readSavedRepositories, SAVED_REPOSITORIES_KEY } from "@/lib/analysis/local-history";

export function SaveRepositoryButton({ repository, url }: { repository: string; url: string }) {
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
        { repository, url, savedAt: new Date().toISOString() },
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
      {saved ? "Saved on this device" : "Save repository"}
    </Button>
  );
}
