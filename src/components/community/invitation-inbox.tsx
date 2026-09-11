"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";
import { projectInvitations, respondToInvitation } from "@/lib/community/client-api";
import type { CommunityInvitation, CommunityPage } from "@/lib/community/types";

export function InvitationInbox() {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p className="hub-notice">Verify your email to review invitations. <Link href="/account">Open your account →</Link></p>;
  return <Invitations key={session.token} token={session.token} />;
}

function Invitations({ token }: { token: string }) {
  const [page, setPage] = useState<CommunityPage<CommunityInvitation> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState<{ item: CommunityInvitation; accept: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    projectInvitations(token, undefined, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(value => { if (!controller.signal.aborted) { setPage(value); setError(""); } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Invitations could not be loaded."); });
    return () => controller.abort();
  }, [token, cursor, refresh]);
  function load(next?: string) { setPage(null); setCursor(next); setDecision(null); setRefresh(value => value + 1); }
  async function respond() {
    if (!decision || busy) return;
    setBusy(true); setError("");
    try {
      const result = await respondToInvitation(token, decision.item.invitationId, decision.accept);
      setStatus(`Invitation ${result.state}.`); load(cursor);
    } catch (error) { setError(error instanceof Error ? error.message : "Your response could not be saved. Refresh to check its current state before retrying."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Your project invitations">
    {error && <p className="hub-notice" role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {decision && <section className="hub-notice" aria-label="Confirm invitation response"><h2>{decision.accept ? "Accept" : "Decline"} invitation to {decision.item.projectTitle}?</h2>
      <p>{!decision.accept ? "You will not receive access through this invitation." : decision.item.kind === "ownership" ? "You will become the project owner, responsible for its members and shared content. The previous owner will remain a maintainer. Other pending invitations will be revoked." : "You will gain access to private drafts, uploads and releases, and can edit and submit this project for review."}</p>
      <div className="hub-actions"><button className="btn btn-primary" disabled={busy} onClick={() => void respond()}>{busy ? "Saving…" : `Confirm ${decision.accept ? "acceptance" : "decline"}`}</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => setDecision(null)}>Cancel</button></div></section>}
    {!page && !error && <p role="status">Loading invitations…</p>}
    {page?.items.length === 0 && <p className="hub-empty">No invitations on this page.</p>}
    {page?.items.map(item => <article className="hub-activity-entry" key={item.invitationId}><p className="hub-kicker">{item.kind === "ownership" ? "Ownership offer" : "Maintainer invitation"} · {item.state}</p>
      <h2>{item.projectTitle}</h2><p>From {item.senderHandle ? `@${item.senderHandle}` : "a project owner"} · Sent <time dateTime={item.createdAtUtc}>{new Date(item.createdAtUtc).toLocaleString()}</time></p>
      {item.state === "pending" && <><p>Expires <time dateTime={item.expiresAtUtc}>{new Date(item.expiresAtUtc).toLocaleString()}</time></p><div className="hub-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => setDecision({ item, accept: true })}>Review acceptance</button><button className="btn btn-ghost" disabled={busy} onClick={() => setDecision({ item, accept: false })}>Decline</button></div></>}
      {item.state === "accepted" && <Link href={`/account/creations/${item.projectId}/edit`}>Open project →</Link>}
    </article>)}
    <nav className="hub-actions" aria-label="Invitation pages"><button className="btn btn-ghost" disabled={busy} onClick={() => load(cursor)}>Refresh</button>
      {cursor && <button className="btn btn-ghost" disabled={busy} onClick={() => load()}>Newest invitations</button>}
      {page?.nextCursor && <button className="btn btn-ghost" disabled={busy} onClick={() => load(page.nextCursor ?? undefined)}>Older invitations</button>}</nav>
  </section>;
}
