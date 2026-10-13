"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { crown, refresh as refreshGlyph, sent, user, userRemove01 } from "@/components/ui/icons";
import { AuthPanel } from "@/components/account/auth-panel";
import { Actions, ArrowLink, Block, ConfirmDialog, Fine, Glyph, Pager, Pending, Row, Rows, StateTag, formatDateTime } from "@/components/account/kit";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityInvitation, CommunityMember, CommunityPage } from "@/lib/community/types";

import styles from "./project-members.module.css";

export function ProjectMembers({ id }: { id: string }) {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your email to manage project membership." action={<ArrowLink href="/account">Open your account</ArrowLink>}>
        Verification happens once, from your account overview.
      </Notice>
    );
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
  if (left)
    return (
      <Notice kind="success" title="You left the project." action={<ArrowLink href="/account/creations">Back to my creations</ArrowLink>}>
        Its private workspace is no longer accessible.
      </Notice>
    );
  const actionTitle = !action ? "" : action.kind === "ownership" ? "Offer project ownership?" : action.kind === "revoke" ? "Revoke this invitation?" : action.member.accountId === accountId ? "Leave this project?" : "Remove this member?";
  const actionText = !action ? "" : action.kind === "ownership" ? `@${action.member.handle} will become the owner if they accept. You will remain a maintainer and lose the ability to manage members. Other pending invitations will be revoked on acceptance.` : action.kind === "revoke" ? "The recipient will no longer be able to accept this invitation." : "Access to private drafts, uploads and releases ends immediately. Published release history remains unchanged.";
  return (
    <section className={styles.members} aria-label="Project membership">
      <Actions className={styles.toolbar}>
        <ArrowLink href={`/account/creations/${id}/edit`}>Back to editor</ArrowLink>
        <ArrowLink href="/account/invitations">My invitations</ArrowLink>
        <Button lines="none" color="neutral" border size="sm" icon={refreshGlyph} iconPosition="left" disabled={busy} onClick={() => load(cursor)}>
          Refresh membership
        </Button>
      </Actions>
      {error && !action ? <Notice kind="danger">{error}</Notice> : null}
      {status ? <Notice kind="success">{status}</Notice> : null}

      <ConfirmDialog
        open={!!action}
        onClose={() => { setAction(null); setError(""); }}
        eyebrow="Confirm membership change"
        title={actionTitle}
        danger={action?.kind !== "ownership"}
        busy={busy}
        busyLabel="Saving…"
        confirmLabel="Confirm change"
        onConfirm={() => void execute()}
        error={action && error ? error : undefined}
      >
        <p>{actionText}</p>
      </ConfirmDialog>

      <Block eyebrow="Project team" title="Members" lead="The owner and the maintainers who can edit drafts, upload releases and submit for review.">
        {!members && !error ? <Pending label="Loading members" /> : null}
        {members ? (
          <Rows label="Project members">
            {members.map(member => (
              <Row
                key={member.membershipId}
                leading={<Glyph glyph={member.role === "owner" ? crown : user} />}
                marker={member.accountId === accountId}
                meta={<StateTag state={member.role} />}
                title={<>{member.handle ? `@${member.handle}` : "Creator without a public profile"}{member.accountId === accountId ? <span className={styles.you}> (you)</span> : null}</>}
                aside={member.role === "maintainer" ? (
                  <>
                    {owner || member.accountId === accountId ? (
                      <Button lines="none" color="red" border size="sm" icon={userRemove01} iconPosition="left" disabled={busy} onClick={() => { setError(""); setAction({ kind: "remove", member }); }}>
                        {member.accountId === accountId ? "Leave project" : "Remove member"}
                      </Button>
                    ) : null}
                    {owner && member.handle ? (
                      <Button lines="none" color="neutral" border size="sm" icon={crown} iconPosition="left" disabled={busy} onClick={() => { setError(""); setAction({ kind: "ownership", member }); }}>
                        Offer ownership
                      </Button>
                    ) : null}
                  </>
                ) : undefined}
              />
            ))}
          </Rows>
        ) : null}
      </Block>

      {owner ? (
        <>
          <Block eyebrow="Invite" title="Invite a maintainer" lead="Recipients need a verified account and a public creator profile. They will see this project’s current title in their invitation.">
            <form className={styles.invite} onSubmit={event => { event.preventDefault(); void execute(true); }}>
              <Field label="Public creator handle">
                <Input icon={user} required minLength={3} maxLength={32} value={handle} onChange={event => setHandle(event.target.value)} placeholder="creator-handle" disabled={busy} />
              </Field>
              <Button type="submit" lines="none" icon={sent} iconPosition="left" disabled={busy || !handle.trim()}>
                Send invitation
              </Button>
            </form>
          </Block>
          <Block eyebrow="Pending and past" title="Sent invitations">
            {!invitations && !error ? <Pending label="Loading invitations" /> : null}
            {invitations?.items.length === 0 ? <Fine>No invitations on this page.</Fine> : null}
            {invitations?.items.length ? (
              <Rows label="Sent invitations">
                {invitations.items.map(item => (
                  <Row
                    key={item.invitationId}
                    marker={item.state === "pending"}
                    meta={
                      <>
                        <StateTag state={item.state} />
                        <span>{item.kind}</span>
                        <span>Sent {formatDateTime(item.createdAtUtc)}</span>
                      </>
                    }
                    title={item.recipientHandle ? `@${item.recipientHandle}` : "Creator without a public profile"}
                    description={item.state === "pending" ? `Expires ${formatDateTime(item.expiresAtUtc)}` : undefined}
                    aside={item.state === "pending" ? (
                      <Button lines="none" color="red" border size="sm" disabled={busy} onClick={() => { setError(""); setAction({ kind: "revoke", invitation: item }); }}>
                        Revoke invitation
                      </Button>
                    ) : undefined}
                  />
                ))}
              </Rows>
            ) : null}
            <Pager label="Sent invitation pages">
              {cursor ? <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => load()}>Newest invitations</Button> : null}
              {invitations?.nextCursor ? <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => load(invitations.nextCursor ?? undefined)}>Older invitations</Button> : null}
            </Pager>
          </Block>
        </>
      ) : null}
    </section>
  );
}
