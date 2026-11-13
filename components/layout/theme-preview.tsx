"use client";

import { useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

type PreviewTheme = "light" | "dark";

export function ThemePreview() {
  const { text: t } = useLanguage();
  const [theme, setTheme] = useState<PreviewTheme>("light");
  const dark = theme === "dark";

  return (
    <section aria-labelledby="theme-preview-title" className="border-b bg-muted/30">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary">{t("Choose your look")}</p>
          <h2 id="theme-preview-title" className="mt-2 text-2xl font-semibold tracking-tight">{t("Preview light and dark themes")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("Switch the preview to see how RepoLens looks in each theme. This preview won't change your current site theme.")}
          </p>
          <div className="mt-5 flex gap-2" aria-label="Theme preview">
            <Button type="button" size="sm" variant={dark ? "outline" : "secondary"} aria-pressed={!dark} onClick={() => setTheme("light")}>
              <Sun /> {t("Light")}
            </Button>
            <Button type="button" size="sm" variant={dark ? "secondary" : "outline"} aria-pressed={dark} onClick={() => setTheme("dark")}>
              <Moon /> {t("Dark")}
            </Button>
          </div>
        </div>

        <div
          aria-label={`${theme} theme preview`}
          className={cn(
            "rounded-2xl border p-4 shadow-lg transition-colors sm:p-6",
            dark ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900",
          )}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: dark ? "#334155" : "#e2e8f0" }}>
            <span className="font-semibold">RepoLens</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs", dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
              {t("Portfolio readiness")}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className={cn("grid size-16 shrink-0 place-items-center rounded-full border-4 border-primary font-semibold", dark ? "bg-slate-900" : "bg-slate-50")}>
              84
            </div>
            <div>
              <p className="font-medium">vercel/next.js</p>
              <p className={cn("mt-1 text-sm", dark ? "text-slate-400" : "text-slate-500")}>{t("Strong portfolio foundation")}</p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {["README", "License", "Tests", "Live demo"].map((item) => (
              <li key={item} className={cn("flex items-center gap-2 rounded-lg px-3 py-2", dark ? "bg-slate-900" : "bg-slate-50")}>
                <Check aria-hidden="true" className="size-4 text-emerald-500" /> {t(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
