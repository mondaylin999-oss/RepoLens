import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import type { CheckStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<CheckStatus, string> = { pass: "Detected", fail: "Not found", unknown: "Unverified" };

export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = status === "pass" ? CheckCircle2 : status === "fail" ? XCircle : CircleHelp;
  const color = status === "pass" ? "text-success" : status === "fail" ? "text-danger" : "text-warning";
  return <Icon aria-hidden="true" className={cn("size-5 shrink-0", color, className)} />;
}
