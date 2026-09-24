"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { masterCall } from "@/lib/account/api";
import { useSession, type StoredSession } from "@/lib/account/session";

type Connection = { connectionId: string; label: string; projectId: string | null; scopes: string[]; approvedAtUtc: string; expiresAtUtc: string; revoked: boolean };
type Preview = { label: string; scopes: string[]; expiresAtUtc: string };
type Project = { projectId: string; content: { title: string } };
const root = "/api/v1/community/connections";
const errorText = (error: unknown) => error instanceof Error ? error.message : "The connection could not be updated.";

export function WardenConnections({ approve = false }: { approve?: boolean }) {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (approve && !session.emailVerified) return <p>Verify your email before approving a connection. <Link href="/account">Open your account →</Link></p>;
  return approve ? <Approval key={session.token} session={session} /> : <ConnectionList key={session.token} session={session} />;
}

function ConnectionList({ session }: { session: StoredSession }) {
  const [data, setData] = useState<{ items: Connection[]; connectionsAvailable: boolean } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const operation = new AbortController();
    void masterCall<{ items: Connection[]; connectionsAvailable: boolean }>(root, { token: session.token, signal: AbortSignal.any([operation.signal, AbortSignal.timeout(10000)]) })
      .then(value => { if (!operation.signal.aborted) { setData(value); setError(""); } })
      .catch(error => { if (!operation.signal.aborted) setError(errorText(error)); });
    return () => operation.abort();
  }, [session.token, refresh]);
  async function revoke(id: string) {
    setBusy(true); setError("");
    try {
      await masterCall<void>(`${root}/${encodeURIComponent(id)}/revoke`, { token: session.token, method: "POST", signal: AbortSignal.timeout(15000) });
      setConfirm(null); setRefresh(value => value + 1);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  return <section className="hub-notice" aria-label="Warden creator connections">
    <p>Connected Wardens can prepare resource drafts and upload selected files with your approval. Review and publication remain in the Workshop.</p>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading connections…</p>}
    {data && <>
      {!data.connectionsAvailable && <p>New connections are temporarily unavailable. You can still revoke existing connections.</p>}
      {data.items.length === 0 && <p>You have no Warden connections.</p>}
      {data.items.map(item => <article key={item.connectionId} className="hub-notice">
        <h2>{item.label}</h2><p>{item.projectId ? `Restricted to project ${item.projectId}.` : "Can create one new project, then upload drafts for that project."}</p>
        <p>Permissions: {item.scopes.join(", ")}. Expires {new Date(item.expiresAtUtc).toLocaleString()}.</p>
        {item.revoked ? <p>Revoked</p> : confirm === item.connectionId ? <>
          <p>Revoke this Warden’s access? Existing drafts and uploaded files remain in your account.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => void revoke(item.connectionId)}>Revoke connection</button>{" "}
          <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        </> : <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(item.connectionId)}>Revoke…</button>}
      </article>)}
      {data.connectionsAvailable && <Link href="/account/connections/approve">Enter a code from Warden →</Link>}
    </>}
    <button className="btn btn-ghost" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh connections</button>
  </section>;
}

function Approval({ session }: { session: StoredSession }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  async function inspect() {
    setBusy(true); setError(""); setPreview(null); setConsent(false); setProjectId("");
    try {
      const [device, page] = await Promise.all([
        masterCall<Preview>(`${root}/device/preview`, { token: session.token, method: "POST", body: { userCode: code.trim() }, signal: AbortSignal.timeout(15000) }),
        masterCall<{ items: Project[]; nextCursor: string | null }>("/api/v1/community/me/projects?limit=24", { token: session.token, signal: AbortSignal.timeout(15000) }),
      ]);
      setPreview(device); setProjects(page.items); setCursor(page.nextCursor);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  async function more() {
    if (!cursor) return;
    setBusy(true); setError("");
    try {
      const page = await masterCall<{ items: Project[]; nextCursor: string | null }>(`/api/v1/community/me/projects?limit=24&cursor=${encodeURIComponent(cursor)}`, { token: session.token, signal: AbortSignal.timeout(15000) });
      setProjects(old => [...old, ...page.items.filter(item => !old.some(existing => existing.projectId === item.projectId))]); setCursor(page.nextCursor);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  async function allow() {
    if (!preview || !consent || busy) return;
    setBusy(true); setError("");
    try {
      await masterCall<Connection>(`${root}/device/approve`, { token: session.token, method: "POST", body: { userCode: code.trim(), projectId: projectId || null }, signal: AbortSignal.timeout(15000) });
      setApproved(true);
    } catch (error) { setError(errorText(error)); setConsent(false); }
    finally { setBusy(false); }
  }
  if (approved) return <section className="hub-notice" role="status"><h2>Warden approved</h2><p>Return to Warden to finish connecting and review your export.</p><Link href="/account/connections">Manage connections →</Link></section>;
  return <section className="hub-notice" aria-label="Approve Warden">
    <p>Enter the code displayed by the Warden you are connecting. Check its name and choose what it may access.</p>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void inspect(); }}>
      <label>Warden code <input required maxLength={16} autoComplete="off" spellCheck={false} value={code} disabled={busy}
        onChange={event => { setCode(event.target.value); setPreview(null); setConsent(false); }} /></label>{" "}
      <button className="btn btn-ghost" disabled={busy || !code.trim()}>Review connection</button>
    </form>
    {preview && <div><h2>{preview.label}</h2><p>Requested permissions: {preview.scopes.join(", ")}. Code expires {new Date(preview.expiresAtUtc).toLocaleString()}.</p>
      <label>Allow access to <select value={projectId} disabled={busy} onChange={event => { setProjectId(event.target.value); setConsent(false); }}>
        <option value="">One new project and its drafts</option>
        {projects.map(project => <option key={project.projectId} value={project.projectId}>{project.content.title}</option>)}
      </select></label>{" "}
      {cursor && <button className="btn btn-ghost" disabled={busy} onClick={() => void more()}>Load more projects</button>}
      <p>Warden can create drafts and upload selected resource files within this scope. You can revoke this connection from your account.</p>
      <label><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> I recognize this Warden and approve this access.</label>
      <div className="hub-actions"><button className="btn btn-primary" disabled={busy || !consent} onClick={() => void allow()}>{busy ? "Working…" : "Approve Warden"}</button><Link href="/account/connections">Cancel</Link></div>
    </div>}
  </section>;
}
