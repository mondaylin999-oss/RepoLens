"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

export function JoinWorkspace() {
  const { text: t } = useLanguage();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const fromLink = hash.get("token");
      if (fromLink) {
        window.sessionStorage.setItem("repolens-workspace-invite", fromLink);
        window.history.replaceState(null, "", window.location.pathname);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Read the invite fragment and session storage only in the browser after hydration.
      setToken(fromLink ?? window.sessionStorage.getItem("repolens-workspace-invite") ?? "");
    } catch {
      setToken("");
    }
    void fetch("/api/workspaces", { cache: "no-store" }).then((response) => setSignedIn(response.status !== 401 && response.ok)).catch(() => setSignedIn(false)).finally(() => setReady(true));
  }, []);

  async function join() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspaces/join", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const body = await response.json() as { workspaceId?: string; message?: string };
      if (!response.ok || !body.workspaceId) throw new Error(body.message ?? "The invite couldn't be accepted right now.");
      window.sessionStorage.removeItem("repolens-workspace-invite");
      router.replace(`/workspaces/${body.workspaceId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invite couldn't be accepted right now.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <section className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-bold">{t("Join a workspace")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("Sign in with GitHub, then accept the invite to join this team.")}</p>
        {ready && (signedIn
          ? <Button className="mt-5" disabled={!token || busy} onClick={() => void join()}>{busy ? t("Joining…") : t("Accept invite")}</Button>
          : <Button className="mt-5" onClick={() => void signIn("github", { callbackUrl: "/workspaces/join" })}>{t("Sign in with GitHub")}</Button>)}
        {!token && <p role="alert" className="mt-4 text-sm text-danger">{t("This invite link is missing its code.")}</p>}
        {message && <p role="alert" className="mt-4 text-sm text-danger">{t(message)}</p>}
      </section>
    </div>
  );
}
