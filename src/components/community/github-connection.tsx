"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession, type StoredSession } from "@/lib/account/session";
import * as github from "@/lib/community/github-api";
import { githubConnectionKey, githubPkce } from "@/lib/community/github-pkce";

const errorText = (error: unknown) => error instanceof Error ? error.message : "Your GitHub connection could not be updated.";

export function GitHubAccountConnection() {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p>Verify your email before connecting GitHub. <Link href="/account">Open your account →</Link></p>;
  return <GitHubConnectionControl key={session.token} session={session} />;
}

export function GitHubConnectionControl({ session, projectId, repository }: { session: StoredSession; projectId?: string; repository?: github.GitHubRepository }) {
  const [value, setValue] = useState<github.GitHubConnectionState | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const connecting = useRef<AbortController | null>(null);
  useEffect(() => () => connecting.current?.abort(), []);
  useEffect(() => {
    const operation = new AbortController();
    void github.connection(session.token, repository?.repositoryId, AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!operation.signal.aborted) { setValue(value); setError(""); } })
      .catch(error => { if (!operation.signal.aborted) setError(errorText(error)); });
    return () => operation.abort();
  }, [session.token, repository?.repositoryId, refresh]);
  async function connect() {
    if (!value || busy) return;
    setBusy(true); setError("");
    const operation = new AbortController(); connecting.current = operation;
    try {
      const { verifier, challenge } = await githubPkce();
      const response = await github.connect(session.token, value.connection.revision, challenge, projectId, repository, operation.signal);
      if (operation.signal.aborted) return;
      const url = new URL(response.authorizationUrl);
      if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize") throw new Error("Unsupported GitHub authorization destination.");
      sessionStorage.setItem(githubConnectionKey(response.state), JSON.stringify({ state: response.state, accountId: session.accountId, verifier, expiresAtUtc: response.expiresAtUtc }));
      window.location.assign(url.href);
    } catch (error) { if (!operation.signal.aborted) { setError(errorText(error)); setBusy(false); } }
  }
  async function disconnect() {
    if (!value || busy) return;
    setBusy(true); setError("");
    try { await github.disconnect(session.token, value.connection.revision); setRemoving(false); setValue(null); setRefresh(value => value + 1); }
    catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  return <section className="hub-notice" aria-label="GitHub account connection"><h3>{repository ? "Optional repository verification" : "GitHub connection"}</h3>
    <p>Connect to verify your public GitHub identity{repository ? ` and control of ${repository.fullName}` : ""}. Public imports do not require a connection. No repository write permissions are requested.</p>
    {error && <p role="alert">{error}</p>}
    {!value && !error && <p role="status">Loading GitHub connection…</p>}
    {value && <><p>{value.connection.login ? `Connected as @${value.connection.login}.` : "No GitHub account connected."}</p>
      {repository && <p>{value.controlVerifiedAtUtc ? `Repository control verified on ${new Date(value.controlVerifiedAtUtc).toLocaleString()}. Proof is valid for new imports for 24 hours.` : "No current repository-control proof. You can still import resources you have permission to share."}</p>}
      {!value.oauthAvailable && <p>GitHub connection is currently unavailable. Public import and ZIP publishing remain independent.</p>}
      <div className="hub-actions"><button type="button" className="btn btn-ghost" disabled={busy || !value.oauthAvailable} onClick={() => void connect()}>
        {busy ? "Working…" : value.connection.login ? "Reconnect with GitHub" : "Connect with GitHub"}</button>
        {value.connection.userId !== null && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoving(true)}>Disconnect</button>}</div>
      {removing && <div><p>Disconnect this account and remove its proof for future imports? Existing import history stays unchanged. To revoke GitHub’s app authorization too, use your <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer">GitHub settings ↗</a>.</p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void disconnect()}>Confirm disconnect</button> <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoving(false)}>Cancel</button></div>}</>}
    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setRemoving(false); setRefresh(value => value + 1); }}>Refresh connection</button>
  </section>;
}
