"use client";
import Link from "next/link";
import { Activity, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Avatar } from "@/components/ui/data";
import { Loader, Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowUp01, bubbleChat, checkmarkCircle02, delete02, edit02, notification03, pin, refresh as refreshGlyph } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityComment, CommunityPage, CommunityProject } from "@/lib/community/types";
import { ReportForm } from "./report-form";
import { CommentModeration } from "./comment-moderation";
import { useCommunityDraft } from "./use-community-draft";
import { communityDrafts } from "@/lib/community/drafts";

import styles from "./discussion.module.css";

export function Discussion({ project, page, focusThread = false }: { project: CommunityProject; page: CommunityPage<CommunityComment>; focusThread?: boolean }) {
  const router = useRouter(); const refresh = () => router.refresh();
  const { session } = useSession();
  const [permission, setPermission] = useState<{ token: string; projectId: string; allowed: boolean } | null>(null);
  useEffect(() => {
    if (!session?.emailVerified) return;
    const controller = new AbortController();
    api.projectState(session.token, [project.projectId], AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(items => { if (!controller.signal.aborted) setPermission({ token: session.token, projectId: project.projectId, allowed: items[0]?.canManageComments === true }); })
      .catch(() => { if (!controller.signal.aborted) setPermission(null); });
    return () => controller.abort();
  }, [session?.token, session?.emailVerified, project.projectId, page]);
  const canManage = !!session?.emailVerified && permission?.token === session.token && permission.projectId === project.projectId && permission.allowed;
  return (
    <section className={styles.discussion} aria-label="Community discussion" data-discussion>
      {project.state === "published" ? <CommentComposer projectId={project.projectId} parentId={null} updated={refresh} /> : <Notice kind="info">This archived creation is closed to new comments.</Notice>}
      {page.items.length === 0 ? <p className={styles.empty}>Start the conversation. Ask a question or share how you’re using this creation.</p> : (
        <div className={styles.threads}>
          {page.items.map(comment => <CommentEntry key={comment.commentId} comment={comment} project={project} updated={refresh} initiallyExpanded={focusThread} canManage={canManage} />)}
        </div>
      )}
    </section>
  );
}

function CommentComposer({ projectId, parentId, existing, updated }: { projectId: string; parentId: string | null; existing?: CommunityComment; updated: () => void }) {
  const { session } = useSession();
  const memory = useCommunityDraft(session?.accountId, existing ? `comment-edit:${existing.commentId}` : `comment:${projectId}:${parentId ?? "root"}`);
  const body = memory.draft?.text ?? existing?.body ?? "", notify = memory.draft?.notify ?? true;
  const revision = memory.draft?.revision ?? existing?.revision;
  const canWrite = !!session?.emailVerified && (!existing || existing.authorAccountId === session.accountId);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function change(text: string, notifyReplies = notify) {
    if (!memory.save({ text, notify: notifyReplies, revision, originalBody: memory.draft?.originalBody ?? existing?.body ?? undefined }))
      setError("This tab already holds 64 unsent drafts. Submit or explicitly discard an existing draft before starting another. Your existing drafts have been kept.");
    else setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session || !canWrite || busy) return; setBusy(true); setError("");
    try {
      if (existing) await api.editComment(session.token, existing.commentId, revision!, body);
      else {
        const requestId = memory.draft?.requestId ?? crypto.randomUUID();
        if (!memory.save({ ...memory.draft, text: body, notify, requestId })) throw new Error("Draft memory is full. Discard another draft before submitting.");
        await api.createComment(session.token, projectId, requestId, parentId, body, notify);
      }
      memory.discard(); updated();
    } catch (error) { setError(error instanceof Error ? error.message : "Your comment could not be posted. Your text is still here."); }
    finally { setBusy(false); }
  }
  return (
    <form className={cx(styles.composer, (existing || parentId) && styles.nested)} onSubmit={submit} data-comment-form>
      <Field label={existing ? "Edit your comment" : parentId ? "Your reply" : "Join the discussion"}>
        <Textarea required maxLength={5000} rows={4} value={body} readOnly={busy || !canWrite} placeholder={canWrite ? "Ask a question, share a setup, report what works…" : undefined} onChange={event => change(event.target.value)} />
      </Field>
      {!existing ? <Checkbox checked={notify} onChange={event => change(body, event.target.checked)} disabled={busy || !session?.emailVerified}>Notify me about replies to this thread</Checkbox> : null}
      {!session?.emailVerified ? <p className={styles.hint}><Link href="/account" target="_blank">Sign in with a verified account</Link> to write a comment. Saved drafts are available only to the account that wrote them.</p> : null}
      {memory.draft ? (
        <p role="status" className={styles.draft}>
          <span>Draft kept in this tab for your account across Workshop pages. Reloading or closing the tab loses it.{existing && ` This edit uses revision ${revision}.`}</span>
          <button type="button" className={styles.act} disabled={busy} onClick={() => { if (window.confirm("Discard this unsent draft?")) memory.discard(); }}><Icon glyph={delete02} />Discard draft</button>
        </p>
      ) : null}
      {error ? <Notice kind="danger">{error}</Notice> : null}
      <div className={styles.submit}>
        <Button color="blue" lines="none" size={parentId || existing ? "sm" : "md"} type="submit" busy={busy} disabled={!canWrite || !body.trim()}>
          {existing ? "Save edit" : parentId ? "Post reply" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentEntry({ comment, project, updated, initiallyExpanded = false, canManage = false }: { comment: CommunityComment; project: CommunityProject; updated: () => void; initiallyExpanded?: boolean; canManage?: boolean }) {
  const { session } = useSession(); const [editing, setEditing] = useState<CommunityComment | null>(null); const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); updated(); } catch (error) { setError(error instanceof Error ? error.message : "Action failed. Refresh before trying again."); } finally { setBusy(false); } }
  const own = session?.accountId === comment.authorAccountId;
  const name = comment.authorHandle ? `@${comment.authorHandle}` : comment.state === "deleted" ? "Deleted commenter" : "Community member";
  return (
    <article id={`comment-${comment.commentId}`} className={styles.comment} data-comment data-state={comment.state} data-pinned={comment.pinned || undefined}>
      <header className={styles.head}>
        <Avatar name={comment.authorHandle ?? "?"} size={34} />
        <div className={styles.who}>
          <strong className={styles.author}>{comment.authorHandle ? <Link href={`/workshop/creators/${comment.authorHandle}`}>{name}</Link> : name}</strong>
          <p className={styles.meta}>
            <time dateTime={comment.createdAtUtc}>{new Date(comment.createdAtUtc).toLocaleString()}</time>
            {comment.updatedAtUtc !== comment.createdAtUtc ? <span>· edited</span> : null}
            {comment.pinned ? <Tag variant="solid">Pinned by creator</Tag> : null}
            {comment.resolved ? <Tag>Marked resolved</Tag> : null}
          </p>
        </div>
      </header>
      {editing ? <CommentComposer projectId={project.projectId} parentId={comment.parentId} existing={editing} updated={() => { setEditing(null); updated(); }} /> : (
        <p className={styles.body} data-muted={comment.body ? undefined : true}>{comment.body ?? (comment.state === "deleted" ? "This comment was deleted. Existing replies remain below." : "This comment is hidden.")}</p>
      )}
      {error ? <Notice kind="danger">{error}</Notice> : null}
      <div className={styles.actions}>
        {own && comment.state === "visible" && project.state === "published" ? (
          <button type="button" className={styles.act} disabled={busy} onClick={() => { if (!editing || window.confirm("Discard your unsaved comment edit?")) { if (editing && session) communityDrafts.remove(session.accountId, `comment-edit:${comment.commentId}`); setEditing(editing ? null : comment); } }}>
            <Icon glyph={edit02} />{editing ? "Cancel edit" : "Edit / resume draft"}
          </button>
        ) : null}
        {own && comment.state !== "deleted" ? <button type="button" className={styles.act} disabled={busy} aria-expanded={deleting} onClick={() => setDeleting(value => !value)}><Icon glyph={delete02} />Delete</button> : null}
        {!comment.parentId ? (
          <button type="button" className={styles.act} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            <Icon glyph={expanded ? arrowUp01 : bubbleChat} />{expanded ? "Collapse replies" : "View replies / reply"}
          </button>
        ) : null}
        {!comment.parentId && comment.state === "visible" && session?.emailVerified && canManage ? <>
          <button type="button" className={styles.act} disabled={busy} aria-pressed={comment.pinned} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, !comment.pinned, comment.resolved))}><Icon glyph={pin} />{comment.pinned ? "Unpin" : "Pin"}</button>
          <button type="button" className={styles.act} disabled={busy} aria-pressed={comment.resolved} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, comment.pinned, !comment.resolved))}><Icon glyph={checkmarkCircle02} />{comment.resolved ? "Reopen" : "Mark resolved"}</button>
        </> : null}
      </div>
      {deleting && session ? (
        <Notice kind="warning" title="Delete your comment?" action={
          <span className={styles.confirm}>
            <Button color="red" lines="none" size="sm" busy={busy} onClick={() => void act(() => api.deleteComment(session.token, comment.commentId, comment.revision))}>Confirm deletion</Button>
            <Button color="neutral" border lines="none" size="sm" onClick={() => setDeleting(false)}>Keep comment</Button>
          </span>
        }>Its text will be removed and existing replies will remain.</Notice>
      ) : null}
      {comment.state === "visible" ? <ReportForm targetType="comment" targetId={comment.commentId} /> : null}
      {session?.role === "admin" ? <CommentModeration token={session.token} id={comment.commentId} updated={updated} /> : null}
      {!comment.parentId ? <Activity mode={expanded ? "visible" : "hidden"}><Replies root={comment} project={project} /></Activity> : null}
    </article>
  );
}

function Replies({ root, project }: { root: CommunityComment; project: CommunityProject }) {
  const { session } = useSession(); const [page, setPage] = useState<CommunityPage<CommunityComment> | null>(null); const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0); const [error, setError] = useState(""); const [subscription, setSubscription] = useState<{ accountId: string; value: boolean } | null>(null); const [busy, setBusy] = useState(false);
  const subscribed = subscription && subscription.accountId === session?.accountId ? subscription.value : null;
  useEffect(() => {
    const controller = new AbortController(); const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    api.comments(project.projectId, root.commentId, cursor, signal).then(value => { if (!controller.signal.aborted) { setPage(value); setError(""); } }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Replies could not be loaded."); });
    if (session?.emailVerified) api.threadSubscription(session.token, root.commentId, signal).then(value => { if (!controller.signal.aborted) setSubscription({ accountId: session.accountId, value: value.subscribed }); }).catch(() => { if (!controller.signal.aborted) { setSubscription(null); setError("Reply notification settings could not be loaded. Refresh to try again."); } });
    return () => controller.abort();
  }, [project.projectId, root.commentId, cursor, refresh, session?.token, session?.emailVerified, session?.accountId]);
  const reload = () => setRefresh(value => value + 1);
  async function toggleSubscription() { if (!session || subscribed === null) return; setBusy(true); try { await api.setThreadSubscription(session.token, root.commentId, !subscribed); setSubscription({ accountId: session.accountId, value: !subscribed }); } catch (error) { setError(error instanceof Error ? error.message : "Subscription failed."); } finally { setBusy(false); } }
  return (
    <section className={styles.replies} aria-label="Thread replies">
      {session?.emailVerified && subscribed !== null ? (
        <div>
          <button type="button" className={styles.act} disabled={busy || (!subscribed && root.state !== "visible")} aria-pressed={subscribed} onClick={() => void toggleSubscription()}>
            <Icon glyph={notification03} />{subscribed ? "Stop reply notifications" : "Follow replies"}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {!page && !error ? <Loader label="Replies" /> : null}
      {page?.items.map(comment => <CommentEntry key={comment.commentId} comment={comment} project={project} updated={reload} />)}
      <nav className={styles.replyNav} aria-label="Reply pages">
        <button type="button" className={styles.act} onClick={reload}><Icon glyph={refreshGlyph} />Refresh replies</button>
        {cursor ? <button type="button" className={styles.act} onClick={() => { setPage(null); setCursor(undefined); }}><Icon glyph={arrowUp01} />Newest replies</button> : null}
        {page?.nextCursor ? <button type="button" className={styles.act} onClick={() => { setPage(null); setCursor(page.nextCursor ?? undefined); }}><Icon glyph={arrowDown01} />Older replies</button> : null}
      </nav>
      {root.state === "visible" && project.state === "published" ? <CommentComposer projectId={project.projectId} parentId={root.commentId} updated={() => { setCursor(undefined); reload(); }} /> : null}
    </section>
  );
}
