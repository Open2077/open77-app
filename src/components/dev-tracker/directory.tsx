"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAdminActivity } from "@/components/admin/admin-activity";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/data";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { add01, arrowLeft02, arrowRight02, arrowUpRight01, bubbleChat, search01 } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/dev-tracker/api";
import { categories, categoryLabel, date, stages, states, type Idea } from "@/lib/dev-tracker/types";
import { Badge, Busy, ErrorNotice, SignInNote, useTrackerRead, VoteBox } from "./shared";

import styles from "./tracker.module.css";

export function IdeaCard({ idea, reload, compact = false }: { idea: Idea; reload: () => void; compact?: boolean }) {
  const href = `/dev-tracker/${idea.id}`;
  if (compact) {
    return (
      <article className={styles.boardCard}>
        <Tag tone="neutral">{categoryLabel(idea.category)}</Tag>
        <h4 className={styles.boardTitle}>
          <Link href={href}>{idea.title}</Link>
        </h4>
        <p className={styles.cardMeta}>
          <span>{idea.authorName}</span>
          <span>{idea.upvotes - idea.downvotes} votes</span>
          <span>{idea.comments} comments</span>
        </p>
      </article>
    );
  }
  return (
    <article className={styles.card}>
      <VoteBox idea={idea} onChanged={reload} />
      <div className={styles.cardBody}>
        <div className={styles.cardTags}>
          <Badge state={idea.state} />
          <Tag tone="neutral">{categoryLabel(idea.category)}</Tag>
          {idea.hidden ? <Tag tone="neutral">Hidden</Tag> : null}
          {idea.locked ? <Tag tone="neutral">Discussion locked</Tag> : null}
        </div>
        <h3 className={styles.cardTitle}>
          <Link href={href}>{idea.title}</Link>
        </h3>
        <p className={styles.excerpt}>{idea.body}</p>
        <p className={styles.cardMeta}>
          <span className={styles.author}>
            <Avatar name={idea.authorName} size={22} />
            {idea.authorName}
          </span>
          <span>{date(idea.createdAtUtc)}</span>
          <span className={styles.comments}>
            <Icon glyph={bubbleChat} />
            {idea.comments} {idea.comments === 1 ? "comment" : "comments"}
          </span>
        </p>
      </div>
      <Link className={styles.open} aria-label={`Open idea: ${idea.title}`} href={href}>
        <Icon glyph={arrowUpRight01} />
      </Link>
    </article>
  );
}

const HEADINGS = {
  admin: { eyebrow: "// Staff workspace", title: "Review & moderate" },
  approved: { eyebrow: "// The ideas we believe in", title: "Validated by the team" },
  mine: { eyebrow: "// Your contributions", title: "Your ideas, in one place" },
  all: { eyebrow: "// One community. Many possibilities.", title: "What should we build next?" },
} as const;

function Pagination({ page, total, pageSize, setPage, label }: { page: number; total: number; pageSize: number; setPage: (page: number) => void; label: string }) {
  return (
    <nav className={styles.pagination} aria-label={label}>
      <Button size="sm" color="neutral" border lines="none" icon={arrowLeft02} iconPosition="left" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <span className={styles.pageInfo}>
        Page {page} · {total} ideas
      </span>
      <Button size="sm" color="neutral" border lines="none" icon={arrowRight02} disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
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
  const load = useCallback(
    async (signal: AbortSignal) => {
      const finish = admin ? begin() : undefined;
      try {
        const data = await api.ideas({ view, category, state, sort, q: query, page }, token, signal);
        finish?.(true);
        return data;
      } catch (error) {
        finish?.(signal.aborted ? undefined : false);
        throw error;
      }
    },
    [view, category, state, sort, query, page, token, admin, begin],
  );
  const result = useTrackerRead(`${view}:${category}:${state}:${sort}:${query}:${page}:${token ?? "public"}`, load, ready && (!(view === "mine" || admin) || !!token));
  const reload = result.reload;
  useEffect(() => {
    if (!admin) return;
    window.addEventListener("open77:admin-refresh", reload);
    return () => window.removeEventListener("open77:admin-refresh", reload);
  }, [admin, reload]);
  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(1);
  };
  const heading = HEADINGS[admin ? "admin" : view];
  const filtered = !!(category || (state && !admin) || query);
  return (
    <section className={styles.directory} aria-labelledby="ideas-title">
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <Eyebrow>{heading.eyebrow}</Eyebrow>
          <Display size="sm" id="ideas-title">
            {heading.title}
          </Display>
        </div>
        <p className={styles.count}>
          {result.data ? (
            <>
              <strong>{result.data.total}</strong> {result.data.total === 1 ? "idea" : "ideas"}
            </>
          ) : (
            "Live community feedback"
          )}
        </p>
      </header>
      {admin ? (
        <Notice kind="info" className={styles.notice}>
          Open an idea to approve it, publish a progress update, hide it, lock its discussion or moderate replies. Updates are revision-checked to protect another moderator’s work.
        </Notice>
      ) : null}
      <div className={styles.filters}>
        <form onSubmit={search} className={styles.search} role="search">
          <Input icon={search01} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={120} placeholder="Search ideas before suggesting your own…" aria-label="Search ideas" />
          <Button type="submit" size="sm" color="red" border lines="none">
            Search
          </Button>
        </form>
        <Field label="Category">
          <Select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {(view === "approved" ? stages : states).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sort">
          <Select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Newest first</option>
            <option value="top">Top voted</option>
            <option value="active">Recently active</option>
          </Select>
        </Field>
      </div>
      {query ? (
        <p className={styles.queryLine}>
          <span className={styles.prompt} aria-hidden="true">
            {">"}
          </span>
          Results for “{query}”
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setDraft("");
              setQuery("");
              setPage(1);
            }}
          >
            Clear search
          </button>
        </p>
      ) : null}
      {!session && ready ? <SignInNote /> : null}
      {result.loading || !ready ? <Busy label="IDEAS.FEED" /> : null}
      <ErrorNotice error={result.error} retry={result.reload} />
      {result.data ? (
        <>
          <div className={styles.cards}>
            {result.data.items.map((idea) => (
              <IdeaCard key={`${idea.id}:${idea.revision}:${idea.myVote}`} idea={idea} reload={result.reload} />
            ))}
          </div>
          {!result.data.items.length ? (
            <EmptyState
              eyebrow="// No signal"
              title={filtered ? "Nothing matches these filters." : view === "mine" ? "You have not proposed anything yet." : "No ideas here yet."}
              className={styles.empty}
              action={
                <Button color="red" lines="none" border size="sm" icon={add01} iconPosition="left" href="/dev-tracker/new">
                  Suggest an idea
                </Button>
              }
            >
              {filtered ? "Try another filter or fewer words, or start a new conversation." : "Start a new conversation: describe the problem, then the improvement you have in mind."}
            </EmptyState>
          ) : null}
          {result.data.total > result.data.pageSize || page > 1 ? (
            <Pagination page={page} total={result.data.total} pageSize={result.data.pageSize} setPage={setPage} label="Idea pages" />
          ) : (
            <p className={styles.pageInfo}>
              {result.data.total} {result.data.total === 1 ? "idea" : "ideas"} · page {page}
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}

const STAGE_HINTS: Record<string, string> = {
  approved: "Accepted for consideration",
  planned: "Next on the schedule",
  in_progress: "Being built now",
  testing: "In the hands of testers",
  shipped: "Live for everyone",
};

function BoardColumn({ state, label, index }: { state: string; label: string; index: number }) {
  const [page, setPage] = useState(1);
  const load = useCallback((signal: AbortSignal) => api.ideas({ view: "approved", state, sort: "active", page, pageSize: 8 }, undefined, signal), [state, page]);
  const result = useTrackerRead(`${state}:${page}`, load);
  return (
    <section className={styles.column} data-stage={state} aria-labelledby={`stage-${state}`}>
      <header className={styles.columnHead}>
        <span className={styles.columnIndex}>{String(index + 1).padStart(2, "0")}</span>
        <h3 id={`stage-${state}`} className={styles.columnTitle}>
          {label}
        </h3>
        <span className={styles.columnCount} aria-label={`${label} total`}>
          {result.data?.total ?? "—"}
        </span>
        <small className={styles.columnHint}>{STAGE_HINTS[state]}</small>
      </header>
      {result.loading ? <Busy label={state.toUpperCase().replace("_", ".")} /> : null}
      <ErrorNotice error={result.error} retry={result.reload} />
      <div className={styles.columnCards}>
        {result.data?.items.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} compact reload={result.reload} />
        ))}
      </div>
      {result.data?.total === 0 ? <p className={styles.columnEmpty}>Nothing in this stage yet.</p> : null}
      {result.data && (result.data.total > 8 || page > 1) ? (
        <div className={styles.columnPager}>
          <Button size="sm" color="neutral" border lines="none" iconOnly icon={arrowLeft02} aria-label={`Previous ${label} ideas`} disabled={page === 1} onClick={() => setPage(page - 1)} />
          <span className={styles.pageInfo}>{page}</span>
          <Button size="sm" color="neutral" border lines="none" iconOnly icon={arrowRight02} aria-label={`Next ${label} ideas`} disabled={page * 8 >= result.data.total} onClick={() => setPage(page + 1)} />
        </div>
      ) : null}
    </section>
  );
}

export function DevelopmentBoard() {
  return (
    <section className={styles.directory} aria-labelledby="board-title">
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <Eyebrow>{"// From signal to shipped"}</Eyebrow>
          <Display size="sm" id="board-title">
            Follow the work.
          </Display>
        </div>
        <p className={styles.count}>Staff-maintained progress · no speculative deadlines</p>
      </header>
      <div className={styles.board}>
        {stages.map(([state, label], index) => (
          <BoardColumn key={state} state={state} label={label} index={index} />
        ))}
      </div>
    </section>
  );
}
