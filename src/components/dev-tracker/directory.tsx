"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAdminActivity } from "@/components/admin/admin-activity";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { categories, categoryLabel, date, stages, states, type Idea } from "@/lib/dev-tracker/types";
import { Badge, Busy, ErrorNotice, SignInNote, useTrackerRead, VoteBox } from "./shared";
import styles from "./tracker.module.css";

export function IdeaCard({ idea, reload, compact = false }: { idea: Idea; reload: () => void; compact?: boolean }) {
  return <article className={compact ? styles.boardCard : styles.card}>
    {!compact && <VoteBox idea={idea} onChanged={reload} />}
    <div className={styles.cardBody}><div className={styles.cardTags}><Badge state={idea.state} /><span>{categoryLabel(idea.category)}</span>{idea.hidden && <span>Hidden</span>}{idea.locked && <span>Discussion locked</span>}</div>
      <h3><Link href={`/dev-tracker/${idea.id}`}>{idea.title}</Link></h3><p className={styles.excerpt}>{idea.body}</p><div className={styles.cardMeta}><span>{idea.authorName}</span><span>{date(idea.createdAtUtc)}</span><span>{idea.comments} comments</span>{compact && <span>{idea.upvotes - idea.downvotes} votes</span>}</div>
    </div><Link className={styles.openIdea} aria-label={`Open idea: ${idea.title}`} href={`/dev-tracker/${idea.id}`}>↗</Link>
  </article>;
}

export function IdeaDirectory({ view = "all", admin = false }: { view?: "all" | "approved" | "mine" | "admin"; admin?: boolean }) {
  const { session, ready } = useSession();
  const [category, setCategory] = useState("");
  const [state, setState] = useState(admin ? "proposed" : "");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const token = session?.token;
  const { begin } = useAdminActivity();
  const load = useCallback(async (signal: AbortSignal) => {
    const finish = admin ? begin() : undefined;
    try { const data = await api.ideas({ view, category, state, sort, q: query, page }, token, signal); finish?.(true); return data; }
    catch (error) { finish?.(signal.aborted ? undefined : false); throw error; }
  }, [view, category, state, sort, query, page, token, admin, begin]);
  const result = useTrackerRead(`${view}:${category}:${state}:${sort}:${query}:${page}:${token ?? "public"}`, load, ready && (!(view === "mine" || admin) || !!token));
  const reload = result.reload;
  useEffect(() => {
    if (!admin) return;
    window.addEventListener("open77:admin-refresh", reload);
    return () => window.removeEventListener("open77:admin-refresh", reload);
  }, [admin, reload]);
  const search = (event: FormEvent) => { event.preventDefault(); setQuery(draft.trim()); setPage(1); };
  return <section className={styles.directory}>
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{admin ? "STAFF WORKSPACE" : view === "approved" ? "THE IDEAS WE BELIEVE IN" : view === "mine" ? "YOUR CONTRIBUTIONS" : "ONE COMMUNITY. MANY POSSIBILITIES."}</p><h2>{admin ? "Review & moderate" : view === "approved" ? "Validated by the team" : view === "mine" ? "Your ideas, in one place" : "What should we build next?"}</h2></div><span className={styles.muted}>{result.data ? `${result.data.total} ideas` : "Live community feedback"}</span></div>
    {admin && <p className={styles.notice}>Open an idea to approve it, publish a progress update, hide it, lock its discussion or moderate replies. Updates are revision-checked to protect another moderator’s work.</p>}
    <div className={styles.filters}><form onSubmit={search} className={styles.search}><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={120} placeholder="Search ideas before suggesting your own…" aria-label="Search ideas" /><button type="submit">Search</button></form>
      <label>Category<select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Status<select value={state} onChange={event => { setState(event.target.value); setPage(1); }}><option value="">All statuses</option>{(view === "approved" ? stages : states).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Sort<select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="newest">Newest first</option><option value="top">Top voted</option><option value="active">Recently active</option></select></label>
    </div>
    {!session && ready && <SignInNote />}
    {(result.loading || !ready) && <Busy label="Loading ideas…" />}
    <ErrorNotice error={result.error} retry={result.reload} />
    {result.data && <><div className={styles.cards}>{result.data.items.map(idea => <IdeaCard key={`${idea.id}:${idea.revision}:${idea.myVote}`} idea={idea} reload={result.reload} />)}</div>{!result.data.items.length && <div className={styles.empty}><span>◇</span><h3>No ideas here yet.</h3><p>Try another filter, or start a new conversation.</p><Link href="/dev-tracker/new">Suggest an idea ↗</Link></div>}
      <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page} · {result.data.total} ideas</span><button disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(page + 1)}>Next →</button></div></>}
  </section>;
}

function BoardColumn({ state, label }: { state: string; label: string }) {
  const [page, setPage] = useState(1);
  const load = useCallback((signal: AbortSignal) => api.ideas({ view: "approved", state, sort: "active", page, pageSize: 8 }, undefined, signal), [state, page]);
  const result = useTrackerRead(`${state}:${page}`, load);
  return <section className={styles.boardColumn}><div className={styles.columnHeading}><Badge state={state} /><span aria-label={`${label} total`}>{result.data?.total ?? "—"}</span></div>
    {result.loading && <Busy />}<ErrorNotice error={result.error} retry={result.reload} />
    {result.data?.items.map(idea => <IdeaCard key={idea.id} idea={idea} compact reload={result.reload} />)}
    {result.data?.total === 0 && <p className={styles.columnEmpty}>Nothing in this stage yet.</p>}
    {result.data && (result.data.total > 8 || page > 1) && <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(page - 1)}>←</button><span>{page}</span><button aria-label={`Next ${label} ideas`} disabled={page * 8 >= result.data.total} onClick={() => setPage(page + 1)}>→</button></div>}
  </section>;
}
export function DevelopmentBoard() {
  return <section className={styles.directory}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FROM SIGNAL TO SHIPPED</p><h2>Follow the work.</h2></div><span className={styles.muted}>Staff-maintained progress · no speculative deadlines</span></div><div className={styles.board}>{stages.map(([state, label]) => <BoardColumn key={state} state={state} label={label} />)}</div></section>;
}
