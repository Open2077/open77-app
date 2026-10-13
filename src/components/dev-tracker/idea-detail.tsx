"use client";

import { useCallback, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Avatar, DefinitionList } from "@/components/ui/data";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowUp01, bubbleChat, refresh as refreshGlyph, sent } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { canEdit, categoryLabel, dateTime, message, type Comment, type Detail, type Idea } from "@/lib/dev-tracker/types";
import { OwnerEdit, StaffReview, useRequestId } from "./forms";
import { Badge, Busy, ErrorNotice, SignInNote, useTrackerRead, VoteBox } from "./shared";

import styles from "./discussion.module.css";

export function IdeaDetail({ id }: { id: string }) {
  const { session, ready } = useSession();
  const token = session?.token;
  const load = useCallback((signal: AbortSignal) => api.detail(id, token, signal), [id, token]);
  const result = useTrackerRead(`${id}:${token ?? "guest"}`, load, ready);
  return (
    <section className={styles.detail}>
      {result.loading || !ready ? <Busy label="IDEA.LOAD" /> : null}
      <ErrorNotice error={result.error} retry={result.reload} />
      {result.data ? <IdeaContent key={`${id}:${token ?? "guest"}`} initial={result.data} /> : null}
    </section>
  );
}

function IdeaContent({ initial }: { initial: Detail }) {
  const { session } = useSession();
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const idea = data.idea;
  const token = session?.token;
  const refresh = useCallback(async () => {
    setError("");
    try {
      setData(await api.detail(initial.idea.id, token, AbortSignal.timeout(12000)));
    } catch (error) {
      setError(message(error));
    }
  }, [initial.idea.id, token]);
  async function withdraw() {
    if (!token || busy || !window.confirm("Withdraw this proposal and close its discussion? It will remain visible in the tracker, and your submission quota will not be refunded.")) return;
    setBusy(true);
    try {
      await api.edit(token, idea, { title: idea.title, body: idea.body, category: idea.category, withdraw: true });
      await refresh();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ErrorNotice error={error} retry={() => void refresh()} />
      <Panel as="article" brackets padding="lg" className={styles.idea}>
        <div className={styles.ideaHead}>
          <VoteBox idea={idea} size="lg" onChanged={(updated) => setData({ ...data, idea: updated })} />
          <div className={styles.ideaHeadCopy}>
            <div className={styles.tags}>
              <Badge state={idea.state} />
              <Tag tone="neutral">{categoryLabel(idea.category)}</Tag>
              {idea.hidden ? <Tag tone="neutral">Hidden from the public</Tag> : null}
              {idea.locked ? <Tag tone="neutral">Discussion locked</Tag> : null}
            </div>
            <Display as="h1" size="md" className={cx(styles.ideaTitle, idea.title.length > 56 && styles.long)}>
              {idea.title}
            </Display>
            <p className={styles.byline}>
              <Avatar name={idea.authorName} size={26} />
              <span>
                Proposed by <b>{idea.authorName}</b> · {dateTime(idea.createdAtUtc)}
              </span>
            </p>
          </div>
        </div>
        <div className={styles.ideaBody}>
          <div className={styles.proposal}>{idea.body}</div>
          <DefinitionList
            className={styles.facts}
            items={[
              { label: "Status", value: <Badge state={idea.state} /> },
              { label: "Category", value: categoryLabel(idea.category) },
              {
                label: "Votes",
                value: (
                  <span className={styles.tally}>
                    <span title="Upvotes">
                      <Icon glyph={arrowUp01} />
                      {idea.upvotes}
                    </span>
                    <span title="Downvotes">
                      <Icon glyph={arrowDown01} />
                      {idea.downvotes}
                    </span>
                  </span>
                ),
              },
              {
                label: "Comments",
                value: (
                  <span className={styles.tally}>
                    <span>
                      <Icon glyph={bubbleChat} />
                      {idea.comments}
                    </span>
                  </span>
                ),
              },
              { label: "Proposed", value: dateTime(idea.createdAtUtc) },
              { label: "Updated", value: dateTime(idea.updatedAtUtc) },
            ]}
          />
        </div>
      </Panel>
      {session?.role === "admin" && token ? <StaffReview key={`staff:${idea.revision}`} idea={idea} token={token} updated={refresh} /> : null}
      {canEdit(idea, session?.accountId) && token ? <OwnerEdit key={`edit:${idea.revision}`} idea={idea} token={token} updated={refresh} /> : null}
      {session?.accountId === idea.authorId && idea.state === "proposed" && !idea.hidden && !idea.locked ? (
        <div className={styles.withdraw}>
          <Button size="sm" color="neutral" border lines="none" busy={busy} onClick={() => void withdraw()}>
            Withdraw proposal
          </Button>
        </div>
      ) : null}
      <div className={styles.discussionLayout}>
        <Discussion idea={idea} changed={refresh} />
        <aside className={styles.timeline} aria-labelledby="activity-title">
          <Eyebrow>{"// Staff activity"}</Eyebrow>
          <Display as="h2" size="sm" id="activity-title">
            Progress, in the open.
          </Display>
          {!data.updates.length ? <p className={styles.muted}>No staff decision yet. Community votes and discussion help the team evaluate this proposal.</p> : null}
          <ol className={styles.timelineList}>
            {data.updates.map((update) => (
              <li key={update.id} className={styles.timelineItem}>
                <Badge state={update.state} />
                <p className={styles.timelineMessage}>{update.message}</p>
                <small>
                  {update.authorName} · {dateTime(update.createdAtUtc)}
                </small>
              </li>
            ))}
            <li className={styles.timelineItem} data-origin>
              <span className={styles.timelineOrigin}>Idea proposed</span>
              <small>{dateTime(idea.createdAtUtc)}</small>
            </li>
          </ol>
          <p className={styles.muted}>Latest 100 staff updates. A validated idea is accepted for consideration; “Planned” is the next scheduling step.</p>
        </aside>
      </div>
    </>
  );
}

function Discussion({ idea, changed }: { idea: Idea; changed: () => Promise<void> }) {
  const { session, ready } = useSession();
  const token = session?.token;
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState<Comment | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { requestId, reset } = useRequestId();
  const load = useCallback((signal: AbortSignal) => api.comments(idea.id, page, token, signal), [idea.id, page, token]);
  const result = useTrackerRead(`${idea.id}:${page}:${token ?? "guest"}:${idea.revision}`, load, ready);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError("");
    const payload = { body: body.trim(), parentId: reply ? (reply.parentId ?? reply.id) : null };
    try {
      await api.postComment(token, idea.id, { ...payload, requestId: requestId({ idea: idea.id, ...payload }) });
      reset();
      setBody("");
      setReply(null);
      setPage(Math.max(1, Math.ceil(((result.data?.total ?? 0) + 1) / 30)));
      result.reload();
      await changed();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  const closed = idea.locked || idea.hidden || idea.state === "withdrawn";
  return (
    <section className={styles.discussion} aria-labelledby="discussion-title">
      <header className={styles.discussionHead}>
        <Display as="h2" size="sm" id="discussion-title">
          Discussion <span className={styles.discussionCount}>{idea.comments}</span>
        </Display>
        <Button size="sm" color="neutral" lines="none" icon={refreshGlyph} iconPosition="left" onClick={result.reload}>
          Refresh
        </Button>
      </header>
      <p className={styles.muted}>Discuss the idea, not the person. Keep replies useful and on topic.</p>
      {result.loading ? <Busy label="REPLIES" /> : null}
      <ErrorNotice error={result.error} retry={result.reload} />
      {result.data?.items.length ? (
        <div className={styles.comments}>
          {result.data.items.map((comment) => (
            <CommentItem
              key={`${comment.id}:${comment.revision}`}
              comment={comment}
              locked={idea.locked || idea.hidden}
              replied={setReply}
              changed={() => {
                result.reload();
                void changed();
              }}
            />
          ))}
        </div>
      ) : null}
      {result.data?.total === 0 ? (
        <EmptyState eyebrow="// Quiet channel" title="Start the discussion." className={styles.empty}>
          Share a use case, ask a question or suggest a better approach.
        </EmptyState>
      ) : null}
      {result.data && result.data.total > 30 ? (
        <nav className={styles.pagination} aria-label="Discussion pages">
          <Button size="sm" color="neutral" border lines="none" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className={styles.pageInfo}>Page {page}</span>
          <Button size="sm" color="neutral" border lines="none" disabled={page * 30 >= result.data.total} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      ) : null}
      {!session?.emailVerified ? (
        <SignInNote />
      ) : closed ? (
        <Notice kind="info" className={styles.notice}>
          This discussion is closed. You can still read its history.
        </Notice>
      ) : (
        <form className={styles.composer} onSubmit={submit}>
          {reply ? (
            <div className={styles.replying}>
              <span>
                Replying to <b>{reply.authorName}</b>
              </span>
              <button type="button" className={styles.textButton} onClick={() => setReply(null)}>
                Cancel reply
              </button>
            </div>
          ) : null}
          <Field label={reply ? "Your reply" : "Join the discussion"} hint={`${body.length.toLocaleString("en-GB")} / 4,000`}>
            <Textarea required minLength={2} maxLength={4000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add something to the conversation…" />
          </Field>
          <ErrorNotice error={error} />
          <div className={styles.actions}>
            {/* Keyed: the label scramble keeps the first label it rendered. */}
            <Button key={reply ? "reply" : "comment"} type="submit" color="red" lines="none" icon={sent} iconPosition="left" busy={busy}>
              {reply ? "Post reply" : "Post comment"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function CommentItem({ comment, locked, replied, changed }: { comment: Comment; locked: boolean; replied: (comment: Comment) => void; changed: () => void }) {
  const { session } = useSession();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body ?? "");
  const [moderating, setModerating] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: string) {
    if (!session || busy) return;
    if (action === "delete" && !window.confirm("Delete your comment? Replies will remain, but your text will be removed permanently.")) return;
    setBusy(true);
    setError("");
    try {
      await api.changeComment(session.token, comment, { action, body, reason });
      changed();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  const admin = session?.role === "admin";
  return (
    <article className={styles.comment} data-reply={!!comment.parentId} data-staff={comment.staff || undefined} id={`comment-${comment.id}`}>
      <Avatar name={comment.authorName} size={34} className={styles.commentAvatar} />
      <div className={styles.commentMain}>
        <div className={styles.commentHead}>
          <strong>{comment.authorName}</strong>
          {comment.staff ? (
            <Tag tone="red" variant="solid">
              OPEN//77 team
            </Tag>
          ) : null}
          <time dateTime={comment.createdAtUtc}>{dateTime(comment.createdAtUtc)}</time>
        </div>
        {comment.parentId ? <small className={styles.replyMark}>↳ Reply in this discussion</small> : null}
        {comment.deleted ? (
          <p className={styles.muted}>Comment deleted by its author.</p>
        ) : comment.hidden && !admin ? (
          <p className={styles.muted}>Comment hidden by moderation.</p>
        ) : (
          <p className={styles.commentBody}>{comment.body}</p>
        )}
        {comment.hidden && admin ? <p className={styles.staffNote}>Hidden from players · visible to staff</p> : null}
        {comment.revision > 1 ? <small className={styles.muted}>Updated {dateTime(comment.updatedAtUtc)}</small> : null}
        <div className={styles.commentActions}>
          {session?.emailVerified && !locked && !comment.hidden && !comment.deleted ? (
            <button type="button" onClick={() => replied(comment)}>
              Reply
            </button>
          ) : null}
          {session?.accountId === comment.authorId && !comment.deleted ? (
            <>
              {!locked && !comment.hidden ? (
                <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>
                  Edit
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => void act("delete")}>
                Delete
              </button>
            </>
          ) : null}
          {admin && !comment.deleted ? (
            <button type="button" aria-expanded={moderating} onClick={() => setModerating(!moderating)}>
              {comment.hidden ? "Restore" : "Moderate"}
            </button>
          ) : null}
        </div>
        <ErrorNotice error={error} retry={changed} />
        {editing ? (
          <form
            className={styles.inlineForm}
            onSubmit={(event) => {
              event.preventDefault();
              void act("edit");
            }}
          >
            <Field label="Edit comment">
              <Textarea required minLength={2} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} rows={4} />
            </Field>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy}>
              Save comment
            </Button>
          </form>
        ) : null}
        {moderating ? (
          <form
            className={styles.inlineForm}
            onSubmit={(event) => {
              event.preventDefault();
              void act(comment.hidden ? "restore" : "hide");
            }}
          >
            <Field label="Private moderation reason" hint="At least 10 characters. Never shown publicly.">
              <Input required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <Button type="submit" size="sm" color="red" lines="none" busy={busy}>
              {comment.hidden ? "Restore comment" : "Hide comment"}
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
