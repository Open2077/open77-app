"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession, type StoredSession } from "@/lib/account/session";
import { finishConnection, type GitHubCallbackResult } from "@/lib/community/github-api";
import { githubConnectionKey, readPendingGitHubConnection } from "@/lib/community/github-pkce";

export function GitHubCallback() {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <><p>Sign in with the Open77 account that started this connection.</p><AuthPanel /></>;
  if (!session.emailVerified) return <p>Verify your Open77 email before finishing the GitHub connection. <Link href="/account">Open account →</Link></p>;
  return <Callback key={session.token} session={session} />;
}

function Callback({ session }: { session: StoredSession }) {
  const request = useRef<Promise<GitHubCallbackResult> | null>(null);
  const [result, setResult] = useState<GitHubCallbackResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let visible = true;
    // Share the same one-shot promise across Strict Mode effect replay. Do not
    // retry a consumed provider code when an HTTP response is lost.
    request.current ??= Promise.resolve().then(async () => {
      const query = new URLSearchParams(window.location.search);
      const state = query.get("state") ?? "";
      const code = query.get("code") ?? "";
      const key = githubConnectionKey(state);
      if (query.has("error")) { window.history.replaceState(window.history.state, "", "/account/github/callback"); sessionStorage.removeItem(key); throw new Error("GitHub authorization was cancelled or refused. You can start again from your account."); }
      if (!code || code.length > 1000) throw new Error("The GitHub callback has no valid authorization code. Start again.");
      const pending = readPendingGitHubConnection(sessionStorage.getItem(key), state, session.accountId);
      window.history.replaceState(window.history.state, "", "/account/github/callback");
      try {
        const result = await finishConnection(session.token, state, code, pending.verifier);
        if (result.returnPath !== "/account/github" && !/^\/account\/creations\/[a-f0-9-]{36}\/edit#hub-releases$/.test(result.returnPath))
          throw new Error("GitHub connected, but the return location was invalid. Open your account to inspect the connection.");
        return result;
      } finally { sessionStorage.removeItem(key); }
    });
    request.current.then(value => { if (visible) setResult(value); }).catch(error => {
      if (visible) setError(error instanceof Error ? error.message : "The GitHub connection could not be completed.");
    });
    return () => { visible = false; };
  }, [session.accountId, session.token]);
  if (error) return <div className="hub-notice" role="alert"><p>{error}</p><p>A response may have been lost after the connection completed. Check its current state before starting again.</p><Link className="btn btn-ghost" href="/account/github">Check GitHub connection →</Link></div>;
  if (!result) return <p role="status">Verifying your GitHub identity…</p>;
  return <div className="hub-notice"><h2>Connected as @{result.connection.login}</h2>
    {result.repositoryId !== null && <p>{result.repositoryControlVerified ? "Repository control was verified for new imports during the next 24 hours." : "Repository control could not be verified. You may still share resources you have permission to redistribute."}</p>}
    <Link className="btn btn-primary" href={result.returnPath}>Continue →</Link></div>;
}
