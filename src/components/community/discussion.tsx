"use client";
import Link from "next/link";
import { Activity, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import type { CommunityComment, CommunityPage, CommunityProject } from "@/lib/community/types";
import { ReportForm } from "./report-form";
import { CommentModeration } from "./comment-moderation";
import { useCommunityDraft } from "./use-community-draft";
import { communityDrafts } from "@/lib/community/drafts";

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
  return <section aria-label="Community discussion">{project.state === "published" ? <CommentComposer projectId={project.projectId} parentId={null} updated={refresh} /> : <p className="hub-notice">This archived creation is closed to new comments.</p>}
    {page.items.length === 0 && <p className="hub-notice">Start the conversation. Ask a question or share how you’re using this creation.</p>}
    {page.items.map(comment => <CommentEntry key={comment.commentId} comment={comment} project={project} updated={refresh} initiallyExpanded={focusThread} canManage={canManage} />)}
  </section>;
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
  return <form className="hub-form hub-comment-form" onSubmit={submit}><label>{existing ? "Edit your comment" : parentId ? "Your reply" : "Join the discussion"}
    <textarea required maxLength={5000} rows={4} value={body} readOnly={busy || !canWrite} onChange={event => change(event.target.value)} /></label>
    {!existing && <label className="hub-review-confirm"><input type="checkbox" checked={notify} onChange={event => change(body, event.target.checked)} disabled={busy || !session?.emailVerified} />Notify me about replies to this thread</label>}
    {!session?.emailVerified && <p><Link href="/account" target="_blank">Sign in with a verified account</Link> to write a comment. Saved drafts are available only to the account that wrote them.</p>}
    {memory.draft && <p role="status">Draft kept in this tab for your account across Workshop pages. Reloading or closing the tab loses it.{existing && ` This edit uses revision ${revision}.`} <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { if (window.confirm("Discard this unsent draft?")) memory.discard(); }}>Discard draft</button></p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}<div><button className="btn btn-primary" disabled={busy || !canWrite || !body.trim()}>{busy ? "Saving…" : existing ? "Save edit" : parentId ? "Post reply" : "Post comment"}</button></div>
  </form>;
}

function CommentEntry({ comment, project, updated, initiallyExpanded = false, canManage = false }: { comment: CommunityComment; project: CommunityProject; updated: () => void; initiallyExpanded?: boolean; canManage?: boolean }) {
  const { session } = useSession(); const [editing, setEditing] = useState<CommunityComment | null>(null); const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); updated(); } catch (error) { setError(error instanceof Error ? error.message : "Action failed. Refresh before trying again."); } finally { setBusy(false); } }
  const own = session?.accountId === comment.authorAccountId;
  return <article id={`comment-${comment.commentId}`} className="hub-comment"><header><strong>{comment.authorHandle ? <Link href={`/workshop/creators/${comment.authorHandle}`}>@{comment.authorHandle}</Link> : comment.state === "deleted" ? "Deleted commenter" : "Community member"}</strong>
    <p className="hub-release-meta"><time dateTime={comment.createdAtUtc}>{new Date(comment.createdAtUtc).toLocaleString()}</time>{comment.updatedAtUtc !== comment.createdAtUtc ? " · edited" : ""}{comment.pinned ? " · pinned by creator" : ""}{comment.resolved ? " · marked resolved" : ""}</p></header>
    {editing ? <CommentComposer projectId={project.projectId} parentId={comment.parentId} existing={editing} updated={() => { setEditing(null); updated(); }} /> : <p className="hub-activity-reason">{comment.body ?? (comment.state === "deleted" ? "This comment was deleted. Existing replies remain below." : "This comment is hidden.")}</p>}
    {error && <p className="hub-notice" role="alert">{error}</p>}
    <div className="hub-actions">{own && comment.state === "visible" && project.state === "published" && <button className="btn btn-ghost" disabled={busy} onClick={() => { if (!editing || window.confirm("Discard your unsaved comment edit?")) { if (editing && session) communityDrafts.remove(session.accountId, `comment-edit:${comment.commentId}`); setEditing(editing ? null : comment); } }}>{editing ? "Cancel edit" : "Edit / resume draft"}</button>}
      {own && comment.state !== "deleted" && <button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(value => !value)}>Delete</button>}
      {!comment.parentId && <button className="btn btn-ghost" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Collapse replies" : "View replies / reply"}</button>}
      {!comment.parentId && comment.state === "visible" && session?.emailVerified && canManage && <><button className="btn btn-ghost" disabled={busy} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, !comment.pinned, comment.resolved))}>{comment.pinned ? "Unpin" : "Pin"}</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void act(() => api.markComment(session.token, comment.commentId, comment.revision, comment.pinned, !comment.resolved))}>{comment.resolved ? "Reopen" : "Mark resolved"}</button></>}</div>
    {deleting && session && <div className="hub-notice"><p>Delete your comment? Its text will be removed and existing replies will remain.</p><button className="btn btn-primary" disabled={busy} onClick={() => void act(() => api.deleteComment(session.token, comment.commentId, comment.revision))}>Confirm deletion</button><button className="btn btn-ghost" onClick={() => setDeleting(false)}>Keep comment</button></div>}
    {comment.state === "visible" && <ReportForm targetType="comment" targetId={comment.commentId} />}
    {session?.role === "admin" && <CommentModeration token={session.token} id={comment.commentId} updated={updated} />}
    {!comment.parentId && <Activity mode={expanded ? "visible" : "hidden"}><Replies root={comment} project={project} /></Activity>}
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
    {page?.items.map(comment => <CommentEntry key={comment.commentId} comment={comment} project={project} updated={reload} />)}
    <nav className="hub-actions" aria-label="Reply pages"><button className="btn btn-ghost" onClick={reload}>Refresh replies</button>{cursor && <button className="btn btn-ghost" onClick={() => { setPage(null); setCursor(undefined); }}>Newest replies</button>}{page?.nextCursor && <button className="btn btn-ghost" onClick={() => { setPage(null); setCursor(page.nextCursor ?? undefined); }}>Older replies</button>}</nav>
    {root.state === "visible" && project.state === "published" && <CommentComposer projectId={project.projectId} parentId={root.commentId} updated={() => { setCursor(undefined); reload(); }} />}
  </section>;
}
