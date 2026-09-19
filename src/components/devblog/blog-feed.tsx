"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BlogCard } from "@/components/devblog/blog-card";
import { ArrowRightIcon, CodeIcon, CrossIcon, DiscordIcon, SearchIcon, ServerRackIcon } from "@/components/icons";
import type { BlogPostMeta } from "@/lib/devblog";
import { BLOG_TOPICS, blogArchives, filterBlogPosts, parseBlogFilters, type BlogFilters } from "@/lib/devblog-presentation";
import { site } from "@/lib/site";

const EVENT = "open77:devblog-filters";
function subscribe(callback: () => void) { window.addEventListener("popstate", callback); window.addEventListener(EVENT, callback); return () => { window.removeEventListener("popstate", callback); window.removeEventListener(EVENT, callback); }; }
const snapshot = () => window.location.search;
const serverSnapshot = () => "";

export function BlogFeed({ posts }: { posts: BlogPostMeta[] }) {
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const filters = parseBlogFilters(search);
  const filtered = filterBlogPosts(posts, filters);
  const [featured, ...earlier] = filtered;
  const archives = blogArchives(posts);
  const active = filters.topic !== "all" || !!filters.month || !!filters.query;

  function setFilters(patch: Partial<BlogFilters>, replace = false) {
    const next = { ...filters, ...patch };
    const url = new URL(window.location.href);
    for (const [key, value] of [["topic", next.topic === "all" ? "" : next.topic], ["month", next.month], ["q", next.query]] as const) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    if (url.search === window.location.search) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }

  function reset() { setFilters({ topic: "all", month: "", query: "" }); }

  return <section className="blog-feed" aria-label="Development updates">
    <div className="blog-toolbar">
      <div className="blog-filters" role="group" aria-label="Filter by topic"><button aria-pressed={filters.topic === "all"} onClick={() => setFilters({ topic: "all" })}>All posts</button>{BLOG_TOPICS.map(topic => <button key={topic.id} data-topic={topic.id} aria-pressed={filters.topic === topic.id} onClick={() => setFilters({ topic: topic.id })}>{topic.label}</button>)}</div>
      <div className="blog-search" role="search"><SearchIcon size={17} /><label className="blog-sr-only" htmlFor="devblog-search">Search devblog</label><input id="devblog-search" type="search" maxLength={160} value={filters.query} onChange={event => setFilters({ query: event.target.value }, true)} placeholder="Search the devblog…" />{filters.query && <button aria-label="Clear search" onClick={() => setFilters({ query: "" }, true)}><CrossIcon size={14} /></button>}</div>
    </div>
    <div className="blog-feed-layout">
      <div className="blog-results">
        <div className="blog-results-heading"><p role="status" aria-live="polite" aria-atomic="true">{active ? `${filtered.length} ${filtered.length === 1 ? "post" : "posts"} found` : "Latest post"}{filters.month && <span> / {archives.find(month => month.id === filters.month)?.label ?? filters.month}</span>}</p>{active && <button onClick={reset}>Reset filters <CrossIcon size={12} /></button>}</div>
        {featured ? <><BlogCard post={featured} featured latest={featured.slug === posts[0]?.slug} /><div className="blog-card-grid">{earlier.map(post => <BlogCard key={post.slug} post={post} />)}</div><p className="blog-endnote">{active ? "That's everything matching your filters." : `${posts.length} posts so far — one per working day, straight from the commits.`}</p></> : <div className="blog-empty"><SearchIcon size={29} /><h2>{posts.length ? "Nothing matches." : "No posts yet — the first one is on its way."}</h2><p>{posts.length ? "Try fewer words, another topic, or clear the filters to see every post." : "The daily summaries land on Discord first."}</p>{active && <button className="blog-button" onClick={reset}>Show all posts <ArrowRightIcon /></button>}</div>}
      </div>
      <aside className="blog-sidebar" aria-label="Devblog information and archives">
        <section className="blog-side-panel blog-about"><p className="blog-kicker"><span aria-hidden="true">{"//"}</span> UNDER THE HOOD</p><h2>What this is.</h2><p>A post per working day, written from what actually merged — not a roadmap, not a press release.</p><ul><li><CodeIcon size={21} /><span><strong>Straight from the commits</strong><small>Replication, the client, the dedicated server, the launcher.</small></span></li><li><ServerRackIcon size={21} /><span><strong>Written for people who build</strong><small>API changes and server tooling are called out when they land.</small></span></li><li><DiscordIcon size={21} /><span><strong>Short version on Discord</strong><small>The daily summary lands there first; the full write-up lives here.</small></span></li></ul></section>
        <section className="blog-side-panel blog-archive"><h2 className="blog-kicker"><span aria-hidden="true">{"//"}</span> ARCHIVE</h2><div>{archives.map(month => <button key={month.id} data-month={month.id} aria-pressed={filters.month === month.id} onClick={() => setFilters({ month: filters.month === month.id ? "" : month.id })}><span>{month.label}</span><span className="blog-archive-count">{month.count}</span></button>)}</div><button className="blog-text-link" onClick={reset}>All posts <ArrowRightIcon /></button></section>
        <section className="blog-side-panel blog-follow"><DiscordIcon size={25} /><h2>Follow the build.</h2><p>The daily summaries hit Discord first — it is also where Alpha feedback and reproducible issues reach the team.</p>{site.links.discord && <a className="blog-text-link" href={site.links.discord} target="_blank" rel="noreferrer noopener">Join our Discord <ArrowRightIcon /></a>}<Link className="blog-side-docs" href="/docs">Looking for the APIs? <span>Read the docs <ArrowRightIcon /></span></Link></section>
      </aside>
    </div>
  </section>;
}
