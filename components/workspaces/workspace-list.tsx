"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";

type Workspace = { id: string; name: string; role: "owner" | "member"; memberCount: number };

export function WorkspaceList() {
  const { text: t } = useLanguage();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/workspaces", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { setSignedIn(false); return; }
      const body = await response.json() as { workspaces?: Workspace[]; message?: string };
      if (!response.ok) { setMessage(body.message ?? "Workspaces couldn't be loaded right now."); return; }
      setSignedIn(true);
      setWorkspaces(Array.isArray(body.workspaces) ? body.workspaces : []);
    }).catch(() => setMessage("Workspaces couldn't be loaded right now.")).finally(() => setReady(true));
  }, []);

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
      });
      const body = await response.json() as { workspace?: Workspace; message?: string };
      if (!response.ok || !body.workspace) throw new Error(body.message ?? "Workspace couldn't be created right now.");
      router.push(`/workspaces/${body.workspace.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workspace couldn't be created right now.");
    } finally { setBusy(false); }
  }

  if (!ready) return <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><p className="text-sm text-muted-foreground">{t("Loading workspaces…")}</p></main>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <p className="text-sm font-medium text-primary">RepoLens</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("Team workspaces")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("Review public repositories together. Workspace reviews are visible only to signed-in members.")}</p>
      </header>
      {!signedIn ? (
        <section className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("Sign in with GitHub to create a workspace or join one with an invite link.")}</p>
          <Button className="mt-4" onClick={() => void signIn("github", { callbackUrl: "/workspaces" })}>{t("Sign in with GitHub")}</Button>
        </section>
      ) : (
        <div className="space-y-6">
          <form onSubmit={(event) => void createWorkspace(event)} className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row">
            <Input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} placeholder={t("Workspace name")} required aria-label={t("Workspace name")} />
            <Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? t("Creating…") : t("Create workspace")}</Button>
          </form>
          {workspaces.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="rounded-xl border bg-card p-5">
                  <Link href={`/workspaces/${workspace.id}`} className="font-semibold text-primary hover:underline">{workspace.name}</Link>
                  <p className="mt-2 text-sm text-muted-foreground">{workspace.memberCount} {t("members")} · {t(workspace.role === "owner" ? "Owner" : "Member")}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("You haven't joined a workspace yet.")}</p>}
        </div>
      )}
      {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{t(message)}</p>}
    </div>
  );
}
