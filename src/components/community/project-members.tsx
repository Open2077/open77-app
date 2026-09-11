"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/account/auth-panel";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityInvitation, CommunityMember, CommunityPage } from "@/lib/community/types";

export function ProjectMembers({ id }: { id: string }) {
  const { session, ready } = useSession();
  if (!ready) return <p role="status">Loading your account…</p>;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified) return <p className="hub-notice">Verify your email to manage project membership. <Link href="/account">Open your account →</Link></p>;
  return <Members key={`${id}-${session.token}`} id={id} token={session.token} accountId={session.accountId} />;
}

type Action = { kind: "remove" | "ownership"; member: CommunityMember } | { kind: "revoke"; invitation: CommunityInvitation };
function Members({ id, token, accountId }: { id: string; token: string; accountId: string }) {
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [invitations, setInvitations] = useState<CommunityPage<CommunityInvitation> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [handle, setHandle] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const owner = members?.some(member => member.accountId === accountId && member.role === "owner") ?? false;
  useEffect(() => {
    if (left) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    api.projectMembers(token, id, signal).then(async value => {
      if (controller.signal.aborted) return;
      setMembers(value);
      if (value.some(member => member.accountId === accountId && member.role === "owner")) {
        const page = await api.projectInvitations(token, id, cursor, signal);
        if (!controller.signal.aborted) setInvitations(page);
      }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Membership could not be loaded."); });
    return () => controller.abort();
  }, [token, id, accountId, cursor, refresh, left]);
  function load(next?: string) { setError(""); setMembers(null); setInvitations(null); setCursor(next); setAction(null); setRefresh(value => value + 1); }
  async function execute(invite = false) {
    if (busy || (!invite && !action)) return;
    setBusy(true); setError(""); setStatus("");
    try {
      if (invite) {
        await api.inviteProjectMember(token, id, handle.trim(), "maintainer"); setHandle(""); setStatus("Invitation sent. Access begins only after acceptance.");
      } else if (action?.kind === "ownership") {
        await api.inviteProjectMember(token, id, action.member.handle!, "ownership"); setStatus("Ownership offered. You remain the owner until the recipient accepts.");
      } else if (action?.kind === "revoke") {
        await api.revokeInvitation(token, action.invitation.invitationId); setStatus("Invitation revoked.");
      } else if (action?.kind === "remove") {
        await api.removeProjectMember(token, id, action.member);
        if (action.member.accountId === accountId) { setLeft(true); setMembers(null); setInvitations(null); setAction(null); return; }
        setStatus("Member removed. Their access has ended.");
      }
      load();
    } catch (error) { setError(error instanceof Error ? error.message : "The change could not be saved. Refresh to check its current state before retrying."); }
    finally { setBusy(false); }
  }
  if (left) return <section className="hub-notice"><p role="status">You left the project. Its private workspace is no longer accessible.</p><Link href="/account/creations">Back to my creations →</Link></section>;
  return <section aria-label="Project membership"><div className="hub-actions"><Link href={`/account/creations/${id}/edit`}>Back to editor →</Link><Link href="/account/invitations">My invitations →</Link><button className="btn btn-ghost" disabled={busy} onClick={() => load(cursor)}>Refresh membership</button></div>
    {error && <p className="hub-notice" role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {!members && !error && <p role="status">Loading members…</p>}
    {action && <section className="hub-notice" aria-label="Confirm membership change"><h2>{action.kind === "ownership" ? "Offer project ownership?" : action.kind === "revoke" ? "Revoke this invitation?" : action.member.accountId === accountId ? "Leave this project?" : "Remove this member?"}</h2>
      <p>{action.kind === "ownership" ? `@${action.member.handle} will become the owner if they accept. You will remain a maintainer and lose the ability to manage members. Other pending invitations will be revoked on acceptance.` : action.kind === "revoke" ? "The recipient will no longer be able to accept this invitation." : "Access to private drafts, uploads and releases ends immediately. Published release history remains unchanged."}</p>
      <div className="hub-actions"><button className="btn btn-primary" disabled={busy} onClick={() => void execute()}>{busy ? "Saving…" : "Confirm change"}</button><button className="btn btn-ghost" disabled={busy} onClick={() => setAction(null)}>Cancel</button></div></section>}
    {members?.map(member => <article className="hub-activity-entry" key={member.membershipId}><h2>{member.handle ? `@${member.handle}` : "Creator without a public profile"}{member.accountId === accountId ? " (you)" : ""}</h2><p>{member.role}</p>
      {member.role === "maintainer" && <div className="hub-actions">{(owner || member.accountId === accountId) && <button className="btn btn-ghost" disabled={busy} onClick={() => setAction({ kind: "remove", member })}>{member.accountId === accountId ? "Leave project" : "Remove member"}</button>}
        {owner && member.handle && <button className="btn btn-ghost" disabled={busy} onClick={() => setAction({ kind: "ownership", member })}>Offer ownership</button>}</div>}
    </article>)}
    {owner && <><form className="hub-form" onSubmit={event => { event.preventDefault(); void execute(true); }}><h2>Invite a maintainer</h2><label>Public creator handle<input required minLength={3} maxLength={32} value={handle} onChange={event => setHandle(event.target.value)} placeholder="creator-handle" disabled={busy} /></label>
      <p>Recipients need a verified account and a public creator profile. They will see this project’s current title in their invitation.</p><button className="btn btn-primary" disabled={busy || !handle.trim()}>Send invitation</button></form>
      <h2>Sent invitations</h2>{!invitations && !error && <p role="status">Loading invitations…</p>}{invitations?.items.length === 0 && <p>No invitations on this page.</p>}
      {invitations?.items.map(item => <article className="hub-activity-entry" key={item.invitationId}><h3>{item.recipientHandle ? `@${item.recipientHandle}` : "Creator without a public profile"}</h3><p>{item.kind} · {item.state} · Sent {new Date(item.createdAtUtc).toLocaleString()}</p>
        {item.state === "pending" && <><p>Expires {new Date(item.expiresAtUtc).toLocaleString()}</p><button className="btn btn-ghost" disabled={busy} onClick={() => setAction({ kind: "revoke", invitation: item })}>Revoke invitation</button></>}
      </article>)}<nav className="hub-actions" aria-label="Sent invitation pages">{cursor && <button className="btn btn-ghost" disabled={busy} onClick={() => load()}>Newest invitations</button>}{invitations?.nextCursor && <button className="btn btn-ghost" disabled={busy} onClick={() => load(invitations.nextCursor ?? undefined)}>Older invitations</button>}</nav></>}
  </section>;
}
