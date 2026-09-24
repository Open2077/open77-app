"use client";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { canEdit, categoryLabel, dateTime, message, type Comment, type Detail, type Idea } from "@/lib/dev-tracker/types";
import { Badge, Busy, ErrorNotice, SignInNote, useTrackerRead, VoteBox } from "./shared";
import { OwnerEdit, StaffReview, useRequestId } from "./forms";
import styles from "./tracker.module.css";

export function IdeaDetail({ id }: { id: string }) {
  const { session, ready } = useSession(); const token = session?.token;
  const load = useCallback((signal: AbortSignal) => api.detail(id, token, signal), [id, token]);
  const result = useTrackerRead(`${id}:${token ?? "guest"}`, load, ready);
  return <section className={styles.detail}><Link href="/dev-tracker" className={styles.back}>← Back to ideas</Link>{(result.loading || !ready) && <Busy label="Opening the discussion…" />}<ErrorNotice error={result.error} retry={result.reload} />
    {result.data && <IdeaContent key={`${id}:${token ?? "guest"}`} initial={result.data} />}</section>;
}

function IdeaContent({ initial }: { initial: Detail }) {
  const { session } = useSession();
  const [data, setData] = useState(initial); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const idea = data.idea; const token = session?.token;
  const refresh = useCallback(async () => {
    setError("");
    try { setData(await api.detail(initial.idea.id, token, AbortSignal.timeout(12000))); }
    catch (error) { setError(message(error)); }
  }, [initial.idea.id, token]);
  async function withdraw() {
    if (!token || busy || !window.confirm("Withdraw this proposal and close its discussion? It will remain visible in the tracker, and your submission quota will not be refunded.")) return;
    setBusy(true);
    try { await api.edit(token, idea, { title: idea.title, body: idea.body, category: idea.category, withdraw: true }); await refresh(); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <><ErrorNotice error={error} retry={() => void refresh()} /><article className={styles.ideaPanel}>
    <div className={styles.ideaHeadline}><VoteBox idea={idea} onChanged={updated => setData({ ...data, idea: updated })} /><div><div className={styles.cardTags}><Badge state={idea.state} /><span>{categoryLabel(idea.category)}</span>{idea.hidden && <span>Hidden from the public</span>}</div><h2>{idea.title}</h2><p className={styles.muted}>Proposed by <b>{idea.authorName}</b> · {dateTime(idea.createdAtUtc)}</p></div></div>
    <div className={styles.proposal}>{idea.body}</div><div className={styles.ideaFooter}><span>{idea.upvotes} upvotes · {idea.downvotes} downvotes · {idea.comments} comments</span><span>Updated {dateTime(idea.updatedAtUtc)}</span></div>
  </article>
  {session?.role === "admin" && token && <StaffReview key={`staff:${idea.revision}`} idea={idea} token={token} updated={refresh} />}
  {canEdit(idea, session?.accountId) && token && <OwnerEdit key={`edit:${idea.revision}`} idea={idea} token={token} updated={refresh} />}
  {session?.accountId === idea.authorId && idea.state === "proposed" && !idea.hidden && !idea.locked && <button className={styles.textButton} disabled={busy} onClick={() => void withdraw()}>Withdraw proposal</button>}
  <div className={styles.discussionLayout}><Discussion idea={idea} changed={refresh} /><aside className={styles.timeline}><p className={styles.eyebrow}>STAFF ACTIVITY</p><h3>Progress, in the open.</h3>
    {!data.updates.length && <p className={styles.muted}>No staff decision yet. Community votes and discussion help the team evaluate this proposal.</p>}
    <ol>{data.updates.map(update => <li key={update.id}><Badge state={update.state} /><p>{update.message}</p><small>{update.authorName} · {dateTime(update.createdAtUtc)}</small></li>)}<li><span className={styles.muted}>Idea proposed</span><small>{dateTime(idea.createdAtUtc)}</small></li></ol>
    <p className={styles.muted}>Latest 100 staff updates. A validated idea is accepted for consideration; “Planned” is the next scheduling step.</p>
  </aside></div></>;
}

function Discussion({ idea, changed }: { idea: Idea; changed: () => Promise<void> }) {
  const { session, ready } = useSession(); const token = session?.token;
  const [page, setPage] = useState(1); const [reply, setReply] = useState<Comment | null>(null);
  const [body, setBody] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { requestId, reset } = useRequestId();
  const load = useCallback((signal: AbortSignal) => api.comments(idea.id, page, token, signal), [idea.id, page, token]);
  const result = useTrackerRead(`${idea.id}:${page}:${token ?? "guest"}:${idea.revision}`, load, ready);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!token || busy) return;
    setBusy(true); setError("");
    const payload = { body: body.trim(), parentId: reply ? reply.parentId ?? reply.id : null };
    try {
      await api.postComment(token, idea.id, { ...payload, requestId: requestId({ idea: idea.id, ...payload }) });
      reset(); setBody(""); setReply(null);
      setPage(Math.max(1, Math.ceil(((result.data?.total ?? 0) + 1) / 30)));
      result.reload(); await changed();
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <section className={styles.discussion} aria-labelledby="discussion-title"><div className={styles.sectionHeading}><h3 id="discussion-title">Discussion <span>{idea.comments}</span></h3><button className={styles.textButton} onClick={result.reload}>Refresh</button></div>
    <p className={styles.muted}>Discuss the idea, not the person. Keep replies useful and on topic.</p>
    {result.loading && <Busy label="Loading replies…" />}<ErrorNotice error={result.error} retry={result.reload} />
    {result.data?.items.map(comment => <CommentItem key={`${comment.id}:${comment.revision}`} comment={comment} locked={idea.locked || idea.hidden} replied={setReply} changed={() => { result.reload(); void changed(); }} />)}
    {result.data?.total === 0 && <div className={styles.empty}><h3>Start the discussion.</h3><p>Share a use case, ask a question or suggest a better approach.</p></div>}
    {result.data && result.data.total > 30 && <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page}</span><button disabled={page * 30 >= result.data.total} onClick={() => setPage(page + 1)}>Next →</button></div>}
    {!session?.emailVerified ? <SignInNote /> : idea.locked || idea.hidden || idea.state === "withdrawn" ? <p className={styles.notice}>This discussion is closed. You can still read its history.</p> : <form className={styles.form} onSubmit={submit}>
      {reply && <div className={styles.replying}>Replying to {reply.authorName}<button type="button" onClick={() => setReply(null)}>Cancel reply</button></div>}
      <label>{reply ? "Your reply" : "Join the discussion"}<textarea required minLength={2} maxLength={4000} rows={5} value={body} onChange={event => setBody(event.target.value)} placeholder="Add something to the conversation…" /></label><span className={styles.counter}>{body.length} / 4,000</span>
      <ErrorNotice error={error} /><button className={styles.primary} disabled={busy}>{busy ? "Posting…" : reply ? "Post reply" : "Post comment"}</button>
    </form>}
  </section>;
}

function CommentItem({ comment, locked, replied, changed }: { comment: Comment; locked: boolean; replied: (comment: Comment) => void; changed: () => void }) {
  const { session } = useSession();
  const [editing, setEditing] = useState(false); const [body, setBody] = useState(comment.body ?? "");
  const [moderating, setModerating] = useState(false); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(action: string) {
    if (!session || busy) return;
    if (action === "delete" && !window.confirm("Delete your comment? Replies will remain, but your text will be removed permanently.")) return;
    setBusy(true); setError("");
    try { await api.changeComment(session.token, comment, { action, body, reason }); changed(); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <article className={styles.comment} data-reply={!!comment.parentId} id={`comment-${comment.id}`}>
    <div className={styles.commentHeading}><strong>{comment.authorName}</strong>{comment.staff && <span className={styles.staffBadge}>OPEN//77 TEAM</span>}<time>{dateTime(comment.createdAtUtc)}</time></div>
    {comment.parentId && <small className={styles.muted}>↳ Reply in this discussion</small>}
    {comment.deleted ? <p className={styles.muted}>Comment deleted by its author.</p> : comment.hidden && session?.role !== "admin" ? <p className={styles.muted}>Comment hidden by moderation.</p> : <p className={styles.commentBody}>{comment.body}</p>}
    {comment.hidden && session?.role === "admin" && <p className={styles.notice}>Hidden from players · visible to staff</p>}
    {comment.revision > 1 && <small className={styles.muted}>Updated {dateTime(comment.updatedAtUtc)}</small>}
    <div className={styles.commentActions}>
      {session?.emailVerified && !locked && !comment.hidden && !comment.deleted && <button onClick={() => replied(comment)}>Reply</button>}
      {session?.accountId === comment.authorId && !comment.deleted && <>{!locked && !comment.hidden && <button onClick={() => setEditing(!editing)}>Edit</button>}<button disabled={busy} onClick={() => void act("delete")}>Delete</button></>}
      {session?.role === "admin" && !comment.deleted && <button onClick={() => setModerating(!moderating)}>{comment.hidden ? "Restore" : "Moderate"}</button>}
    </div><ErrorNotice error={error} retry={changed} />
    {editing && <form className={styles.form} onSubmit={event => { event.preventDefault(); void act("edit"); }}><label>Edit comment<textarea required minLength={2} maxLength={4000} value={body} onChange={event => setBody(event.target.value)} rows={4} /></label><button className={styles.primary} disabled={busy}>Save comment</button></form>}
    {moderating && <form className={styles.form} onSubmit={event => { event.preventDefault(); void act(comment.hidden ? "restore" : "hide"); }}><label>Private moderation reason<input required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><button className={styles.primary} disabled={busy}>{comment.hidden ? "Restore comment" : "Hide comment"}</button></form>}
  </article>;
}
