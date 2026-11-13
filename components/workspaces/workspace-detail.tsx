"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

type Workspace = { id: string; name: string; role: "owner" | "member"; memberCount: number };
type Review = { repository: string; url: string; score: number | null; earned: number; complete: boolean; analyzedAt: string };

export function WorkspaceDetail({ id }: { id: string }) {
  const { text: t, language } = useLanguage();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch(`/api/workspaces/${id}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { workspace?: Workspace; reviews?: Review[]; message?: string };
      if (!response.ok || !body.workspace) throw new Error(body.message ?? "Workspace couldn't be loaded. You may need to sign in or join first.");
      setWorkspace(body.workspace);
      setReviews(Array.isArray(body.reviews) ? body.reviews : []);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Workspace couldn't be loaded right now.")).finally(() => setReady(true));
  }, [id]);

  async function createInvite() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workspaces/${id}/invites`, { method: "POST" });
      const body = await response.json() as { inviteUrl?: string; message?: string };
      if (!response.ok || !body.inviteUrl) throw new Error(body.message ?? "Invite link couldn't be created.");
      setInviteUrl(body.inviteUrl);
      await navigator.clipboard.writeText(body.inviteUrl);
      setMessage("Invite link copied. It expires in seven days and can be used by up to 20 people.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invite link couldn't be created right now.");
    } finally { setBusy(false); }
  }

  if (!ready) return <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><p className="text-sm text-muted-foreground">{t("Loading workspace…")}</p></div>;
  if (!workspace) return <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><p role="alert" className="text-sm text-muted-foreground">{t(message)}</p><Link href="/workspaces" className="mt-4 inline-block text-sm text-primary hover:underline">{t("Back to workspaces")}</Link></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/workspaces" className="text-sm text-primary hover:underline">← {t("Workspaces")}</Link>
      <header className="mt-5 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{workspace.memberCount} {t("members")} · {t(workspace.role === "owner" ? "Owner" : "Member")}</p>
        </div>
        {workspace.role === "owner" && <Button type="button" onClick={() => void createInvite()} disabled={busy}>{busy ? t("Creating invite…") : t("Invite teammates")}</Button>}
      </header>
      {inviteUrl && <div className="mt-4 break-all rounded-lg border bg-muted/30 p-3 text-sm"><span className="font-medium">{t("Invite link")}: </span>{inviteUrl}</div>}
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{t(message)}</p>}
      <section className="mt-8" aria-labelledby="workspace-reviews-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="workspace-reviews-heading" className="text-xl font-semibold">{t("Shared repository reviews")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("Members can share a repository's score and review date from its analysis page.")}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/analyze">{t("Analyze repository")}</Link></Button>
        </div>
        {reviews.length === 0 ? <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{t("No reviews have been shared yet.")}</p> : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {reviews.map((review) => (
              <li key={`${review.url}-${review.analyzedAt}`} className="rounded-xl border bg-card p-4">
                <Link href={`/analyze?url=${encodeURIComponent(review.url)}`} className="font-semibold text-primary hover:underline">{review.repository}</Link>
                <p className="mt-2 text-sm text-muted-foreground">{review.complete ? `${review.score}/100` : `${t("at least")} ${review.earned}/100`} · {new Date(review.analyzedAt).toLocaleDateString(language === "my" ? "my-MM" : "en-US")}</p>
                <Link href={`/analyze?url=${encodeURIComponent(review.url)}`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">{t("Open analysis")} →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
