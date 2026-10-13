"use client";

import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { ArrowLink, ConfirmDialog, Glyph, Pager, Pending, Row, Rows, StateTag, formatDateTime } from "@/components/account/kit";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01, crown, refresh, userAdd01 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import { projectInvitations, respondToInvitation } from "@/lib/community/client-api";
import type { CommunityInvitation, CommunityPage } from "@/lib/community/types";

import styles from "./inbox.module.css";

export function InvitationInbox() {
  const { session, ready } = useSession();
  if (!ready) return <Pending label="Account" />;
  if (!session) return <AuthPanel />;
  if (!session.emailVerified)
    return (
      <Notice kind="info" title="Verify your e-mail first">
        Verify your email to review invitations. <ArrowLink href="/account">Open your account</ArrowLink>
      </Notice>
    );
  return <Invitations key={session.token} token={session.token} />;
}

function Invitations({ token }: { token: string }) {
  const [page, setPage] = useState<CommunityPage<CommunityInvitation> | null>(null);
  const [cursor, setCursor] = useState<string>();
  const [refreshCount, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState<{ item: CommunityInvitation; accept: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    projectInvitations(token, undefined, cursor, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then((value) => {
        if (!controller.signal.aborted) {
          setPage(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Invitations could not be loaded.");
      });
    return () => controller.abort();
  }, [token, cursor, refreshCount]);
  function load(next?: string) {
    setPage(null);
    setCursor(next);
    setDecision(null);
    setRefresh((value) => value + 1);
  }
  async function respond() {
    if (!decision || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await respondToInvitation(token, decision.item.invitationId, decision.accept);
      setStatus(`Invitation ${result.state}.`);
      load(cursor);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your response could not be saved. Refresh to check its current state before retrying.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.section} aria-label="Your project invitations">
      {error && !decision ? <Notice kind="danger">{error}</Notice> : null}
      {status ? <Notice kind="success">{status}</Notice> : null}
      {!page && !error ? <Pending label="Loading invitations" /> : null}
      {page?.items.length === 0 ? (
        <EmptyState eyebrow="Inbox" title="No invitations here">
          {cursor
            ? "No invitations on this page. Return to the newest invitations."
            : "When a project owner invites you as a maintainer, or offers you ownership, it shows up here for seven days."}
        </EmptyState>
      ) : null}
      {page && page.items.length > 0 ? (
        <Rows label="Project invitations">
          {page.items.map((item) => (
            <Row
              key={item.invitationId}
              marker={item.state === "pending"}
              muted={item.state !== "pending" && item.state !== "accepted"}
              leading={<Glyph glyph={item.kind === "ownership" ? crown : userAdd01} tone={item.state === "pending" ? "yellow" : "neutral"} />}
              meta={
                <>
                  <span>{item.kind === "ownership" ? "Ownership offer" : "Maintainer invitation"}</span>
                  <StateTag state={item.state} />
                </>
              }
              title={item.projectTitle}
              description={
                <>
                  <p>
                    From {item.senderHandle ? `@${item.senderHandle}` : "a project owner"} · Sent{" "}
                    <time dateTime={item.createdAtUtc}>{formatDateTime(item.createdAtUtc)}</time>
                  </p>
                  {item.state === "pending" ? (
                    <p className={styles.expires}>
                      Expires <time dateTime={item.expiresAtUtc}>{formatDateTime(item.expiresAtUtc)}</time>
                    </p>
                  ) : null}
                </>
              }
              aside={
                item.state === "pending" ? (
                  <>
                    <Button lines="none" size="sm" disabled={busy} onClick={() => setDecision({ item, accept: true })}>
                      Review acceptance
                    </Button>
                    <Button lines="none" border color="neutral" size="sm" disabled={busy} onClick={() => setDecision({ item, accept: false })}>
                      Decline
                    </Button>
                  </>
                ) : item.state === "accepted" ? (
                  <ArrowLink href={`/account/creations/${item.projectId}/edit`}>Open project</ArrowLink>
                ) : null
              }
            />
          ))}
        </Rows>
      ) : null}
      <Pager label="Invitation pages">
        <Button lines="none" border color="neutral" size="sm" icon={refresh} iconPosition="left" disabled={busy} onClick={() => load(cursor)}>
          Refresh
        </Button>
        {cursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowLeft01} iconPosition="left" disabled={busy} onClick={() => load()}>
            Newest invitations
          </Button>
        ) : null}
        {page?.nextCursor ? (
          <Button lines="none" border color="neutral" size="sm" icon={arrowRight01} disabled={busy} onClick={() => load(page.nextCursor ?? undefined)}>
            Older invitations
          </Button>
        ) : null}
      </Pager>
      <ConfirmDialog
        open={decision !== null}
        onClose={() => setDecision(null)}
        eyebrow={decision?.item.kind === "ownership" ? "Ownership offer" : "Maintainer invitation"}
        title={`${decision?.accept ? "Accept" : "Decline"} invitation to ${decision?.item.projectTitle ?? "this project"}?`}
        confirmLabel={`Confirm ${decision?.accept ? "acceptance" : "decline"}`}
        busyLabel="Saving…"
        busy={busy}
        danger={decision ? !decision.accept : false}
        onConfirm={() => void respond()}
        error={error || undefined}
      >
        <p>
          {!decision?.accept
            ? "You will not receive access through this invitation."
            : decision.item.kind === "ownership"
              ? "You will become the project owner, responsible for its members and shared content. The previous owner will remain a maintainer. Other pending invitations will be revoked."
              : "You will gain access to private drafts, uploads and releases, and can edit and submit this project for review."}
        </p>
      </ConfirmDialog>
    </section>
  );
}
