"use client";

import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

export function LanguageSelector({ id = "interface-language", className = "" }: { id?: string; className?: string }) {
  const { language, setLanguage, text } = useLanguage();
  return (
    <>
      <label htmlFor={id} className="sr-only">
      {text("interfaceLanguage")}
      </label>
      <select
        id={id}
        value={language}
        onChange={(event) => setLanguage(event.target.value as "en" | "my")}
        className={cn("h-9 w-24 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      >
        <option value="en">English</option>
        <option value="my">မြန်မာ</option>
      </select>
    </>
  );
}
