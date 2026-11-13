"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { text } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={text("toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
