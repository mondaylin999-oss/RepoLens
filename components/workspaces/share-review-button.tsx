"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

type Workspace = { id: string; name: string };
type Review = { repository: string; url: string; score: number | null; earned: number; complete: boolean; analyzedAt: string };

export function ShareReviewButton({ review }: { review: Review }) {
  const { text: t } = useLanguage();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/workspaces", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { setSignedIn(false); return; }
      const body = await response.json() as { workspaces?: Workspace[] };
      if (!response.ok || !Array.isArray(body.workspaces)) return;
      setSignedIn(true);
      setWorkspaces(body.workspaces);
      setSelected(body.workspaces[0]?.id ?? "");
    }).catch(() => setSignedIn(false));
  }, []);

  async function share() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workspaces/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Review couldn't be shared right now.");
      setMessage("Review shared with your workspace.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review couldn't be shared right now.");
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) return null;
  if (!signedIn || workspaces.length === 0) {
    return <Button asChild variant="outline" size="sm"><Link href="/workspaces">{t("Share with a team")}</Link></Button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="share-review-workspace">{t("Choose a workspace")}</label>
      <select id="share-review-workspace" value={selected} onChange={(event) => setSelected(event.target.value)} className="h-8 max-w-44 rounded-lg border bg-background px-2 text-xs">
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
      <Button type="button" variant="outline" size="sm" disabled={busy || !selected} onClick={() => void share()}>{busy ? t("Sharing…") : t("Share review")}</Button>
      {message && <span role="status" className="text-xs text-muted-foreground">{t(message)}</span>}
    </div>
  );
}
