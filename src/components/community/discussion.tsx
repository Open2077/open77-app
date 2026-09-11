"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityComment, CommunityPage, CommunityProject } from "@/lib/community/types";
import { ReportForm } from "./report-form";
import { CommentModeration } from "./comment-moderation";

export function Discussion({ project, page, focusThread = false }: { project: CommunityProject; page: CommunityPage<CommunityComment>; focusThread?: boolean }) {
  const router = useRouter(); const refresh = () => router.refresh();
  return <section aria-label="Community discussion">{project.state === "published" ? <CommentComposer projectId={project.projectId} parentId={null} updated={refresh} /> : <p className="hub-notice">This archived creation is closed to new comments.</p>}
    {page.items.length === 0 && <p className="hub-notice">Start the conversation. Ask a question or share how you’re using this creation.</p>}
    {page.items.map(comment => <CommentEntry key={`${comment.commentId}-${comment.revision}`} comment={comment} project={project} updated={refresh} initiallyExpanded={focusThread} />)}
  </section>;
}

function CommentComposer({ projectId, parentId, existing, updated }: { projectId: string; parentId: string | null; existing?: CommunityComment; updated: () => void }) {
  const { session } = useSession(); const [body, setBody] = useState(existing?.body ?? ""); const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const request = useRef<string | null>(null);
  useEffect(() => {
    if (!body || body === existing?.body) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [body, existing?.body]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session || busy) return; setBusy(true); setError("");
    try {
      if (existing) await api.editComment(session.token, existing.commentId, existing.revision, body);
      else { request.current ??= crypto.randomUUID(); await api.createComment(session.token, projectId, request.current, parentId, body, notify); }
      setBody(""); request.current = null; updated();
    } catch (error) { setError(error instanceof Error ? error.message : "Your comment could not be posted. Your text is still here."); }
    finally { setBusy(false); }
  }
  return <form className="hub-form hub-comment-form" onSubmit={submit}><label>{existing ? "Edit your comment" : parentId ? "Your reply" : "Join the discussion"}
    <textarea required maxLength={5000} rows={4} value={body} readOnly={busy} onChange={event => { setBody(event.target.value); request.current = null; }} /></label>
    {!existing && <label className="hub-review-confirm"><input type="checkbox" checked={notify} onChange={event => { setNotify(event.target.checked); request.current = null; }} disabled={busy} />Notify me about replies to this thread</label>}
    {!session?.emailVerified && <p><Link href="/account" target="_blank">Sign in with a verified account</Link> to post. Your text stays in this form.</p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}<div><button className="btn btn-primary" disabled={busy || !session?.emailVerified || !body.trim()}>{busy ? "Saving…" : existing ? "Save edit" : parentId ? "Post reply" : "Post comment"}</button></div>
  </form>;
}

function CommentEntry({ comment, project, updated, initiallyExpanded = false }: { comment: CommunityComment; project: CommunityProject; updated: () => void; initiallyExpanded?: boolean }) {
  const { session } = useSession(); const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); updated(); } catch (error) { setError(error instanceof Error ? error.message : "Action failed. Refresh before trying again."); } finally { setBusy(false); } }
  const own = session?.accountId === comment.authorAccountId;
  return <article id={`comment-${comment.commentId}`} className="hub-comment"><header><strong>{comment.authorHandle ? <Link href={`/creators/${comment.authorHandle}`}>@{comment.authorHandle}</Link> : comment.state === "deleted" ? "Deleted commenter" : "Community member"}</strong>
    <p className="hub-release-meta"><time dateTime={comment.createdAtUtc}>{new Date(comment.createdAtUtc).toLocaleString()}</time>{comment.updatedAtUtc !== comment.createdAtUtc ? " · edited" : ""}{comment.pinned ? " · pinned by creator" : ""}{comment.resolved ? " · marked resolved" : ""}</p></header>
    {editing ? <CommentComposer projectId={project.projectId} parentId={comment.parentId} existing={comment} updated={() => { setEditing(false); updated(); }} /> : <p className="hub-activity-reason">{comment.body ?? (comment.state === "deleted" ? "This comment was deleted. Existing replies remain below." : "This comment is hidden.")}</p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}
    <div className="hub-actions">{own && comment.state === "visible" && project.state === "published" && <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(value => !value)}>{editing ? "Cancel edit" : "Edit"}</button>}
      {own && comment.state !== "deleted" && <button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(value => !value)}>Delete</button>}
      {!comment.parentId && <button className="btn btn-ghost" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Collapse replies" : "View replies / reply"}</button>}
      {!comment.parentId && comment.state === "visible" && session?.accountId === project.ownerAccountId && <><button className="btn btn-ghost" disabled={busy} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, !comment.pinned, comment.resolved))}>{comment.pinned ? "Unpin" : "Pin"}</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, comment.pinned, !comment.resolved))}>{comment.resolved ? "Reopen" : "Mark resolved"}</button></>}</div>
    {deleting && session && <div className="hub-notice"><p>Delete your comment? Its text will be removed and existing replies will remain.</p><button className="btn btn-primary" disabled={busy} onClick={() => void act(() => api.deleteComment(session.token, comment.commentId, comment.revision))}>Confirm deletion</button><button className="btn btn-ghost" onClick={() => setDeleting(false)}>Keep comment</button></div>}
    {comment.state === "visible" && <ReportForm targetType="comment" targetId={comment.commentId} />}
    {session?.role === "admin" && <CommentModeration token={session.token} id={comment.commentId} updated={updated} />}
    {expanded && !comment.parentId && <Replies root={comment} project={project} />}
  </article>;
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
  return <section className="hub-replies" aria-label="Thread replies">{session?.emailVerified && subscribed !== null && <button className="btn btn-ghost" disabled={busy || (!subscribed && root.state !== "visible")} aria-pressed={subscribed} onClick={() => void toggleSubscription()}>{subscribed ? "Stop reply notifications" : "Follow replies"}</button>}
    {error && <p role="alert">{error}</p>}{!page && !error && <p role="status">Loading replies…</p>}
    {page?.items.map(comment => <CommentEntry key={`${comment.commentId}-${comment.revision}`} comment={comment} project={project} updated={reload} />)}
    <nav className="hub-actions" aria-label="Reply pages"><button className="btn btn-ghost" onClick={reload}>Refresh replies</button>{cursor && <button className="btn btn-ghost" onClick={() => { setPage(null); setCursor(undefined); }}>Newest replies</button>}{page?.nextCursor && <button className="btn btn-ghost" onClick={() => { setPage(null); setCursor(page.nextCursor ?? undefined); }}>Older replies</button>}</nav>
    {root.state === "visible" && project.state === "published" && <CommentComposer projectId={project.projectId} parentId={root.commentId} updated={() => { setCursor(undefined); reload(); }} />}
  </section>;
}
