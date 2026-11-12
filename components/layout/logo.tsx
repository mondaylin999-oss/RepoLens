import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <circle cx="14" cy="14" r="6.5" fill="none" strokeWidth="2.6" className="stroke-primary-foreground" />
      <path d="M19 19l5.5 5.5" strokeWidth="2.8" strokeLinecap="round" className="stroke-primary-foreground" />
      <path d="M11.2 14.2l2 2 3.8-4" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <LogoMark />
      <span className="text-[17px]">RepoLens</span>
    </Link>
  );
}
