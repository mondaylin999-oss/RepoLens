"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language-provider";

const STORAGE_KEY = "repolens-first-visit-guide-dismissed";

export function FirstVisitGuide() {
  const { text: t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "true");
    } catch {
      setVisible(true);
    }
    setReady(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // The guide stays dismissed for the current page session.
    }
  }

  if (!ready || !visible) return null;

  return (
    <aside aria-label={t("Quick start guide")} className="border-b bg-accent/40">
      <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 py-5 sm:px-6">
        <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("Quick start")}</h2>
          <ol className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
            <li>{t("1. Enter a public GitHub URL or choose an example.")}</li>
            <li>{t("2. Select")} <span className="font-medium text-foreground">{t("Analyze Repository")}</span>.</li>
            <li>{t("3. Review the score, evidence, and improvement ideas.")}</li>
          </ol>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={t("Dismiss quick start guide")} onClick={dismiss}>
          <X />
        </Button>
      </div>
    </aside>
  );
}
