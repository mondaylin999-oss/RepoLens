"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { text: t } = useLanguage();
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {state === "copied" ? <Check /> : <Copy />}
      {state === "copied" ? t("Copied") : state === "error" ? t("Copy failed") : t(label)}
    </Button>
  );
}
