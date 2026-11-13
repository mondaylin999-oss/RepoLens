import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export function formatCount(n: number): string {
  return n < 1000 ? String(n) : compact.format(n);
}

export function formatSize(kilobytes: number): string {
  if (kilobytes < 1024) return `${kilobytes} KB`;
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(1)} MB`;
  return `${(megabytes / 1024).toFixed(1)} GB`;
}

export function formatDate(iso: string | null, locale = "en"): string {
  if (!iso) return "Unknown";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
}

export function relativeTime(iso: string | null, now = Date.now(), locale = "en"): string {
  if (!iso) return "";
  const diff = (new Date(iso).getTime() - now) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  if (locale.toLowerCase().startsWith("my")) {
    if (Math.abs(diff) < 60) return "ယခုလေးတင်";
    const unitNames: Partial<Record<Intl.RelativeTimeFormatUnit, string>> = {
      year: "နှစ်", month: "လ", week: "ပတ်", day: "ရက်", hour: "နာရီ", minute: "မိနစ်",
    };
    for (const [unit, seconds] of units) {
      if (Math.abs(diff) >= seconds) {
        const amount = new Intl.NumberFormat("my-MM").format(Math.round(Math.abs(diff) / seconds));
        return diff < 0 ? `လွန်ခဲ့သော ${amount} ${unitNames[unit]}` : `${amount} ${unitNames[unit]} အတွင်း`;
      }
    }
  }
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), unit);
  return rtf.format(0, "second");
}

export const PROJECT_REPO_URL = process.env.NEXT_PUBLIC_PROJECT_REPO_URL || "";
