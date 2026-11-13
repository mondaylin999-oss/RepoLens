"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
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
      {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label}
    </Button>
  );
}
