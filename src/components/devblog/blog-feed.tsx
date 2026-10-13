"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowRight02, cancel01, code, discord, search01, serverStack01 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { SmartLink } from "@/components/ui/smart-link";
import { Display, Eyebrow } from "@/components/ui/typography";
import type { BlogPostMeta } from "@/lib/devblog";
import { BLOG_TOPICS, blogArchives, filterBlogPosts, parseBlogFilters, postTopics, type BlogFilters } from "@/lib/devblog-presentation";
import { site } from "@/lib/site";
import { BlogCard } from "./blog-card";

import styles from "./blog-feed.module.css";

const EVENT = "open77:devblog-filters";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(EVENT, callback);
  };
}
const snapshot = () => window.location.search;
const serverSnapshot = () => "";

/** Posts grouped by month, newest first, keeping the feed order. */
function byMonth(posts: BlogPostMeta[]) {
  const groups: Array<{ id: string; label: string; posts: BlogPostMeta[] }> = [];
  for (const post of posts) {
    const id = post.date.slice(0, 7);
    let group = groups.at(-1);
    if (group?.id !== id) {
      group = { id, label: new Date(`${id}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), posts: [] };
      groups.push(group);
    }
    group.posts.push(post);
  }
  return groups;
}

export function BlogFeed({ posts }: { posts: BlogPostMeta[] }) {
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const filters = parseBlogFilters(search);
  const filtered = filterBlogPosts(posts, filters);
  const [featured, ...earlier] = filtered;
  const archives = blogArchives(posts);
  const active = filters.topic !== "all" || !!filters.month || !!filters.query;
  const issues = new Map(posts.map((post, index) => [post.slug, posts.length - index]));
  const topicCounts = new Map(BLOG_TOPICS.map((topic) => [topic.id, posts.filter((post) => postTopics(post).some((item) => item.id === topic.id)).length]));

  function setFilters(patch: Partial<BlogFilters>, replace = false) {
    const next = { ...filters, ...patch };
    const url = new URL(window.location.href);
    for (const [key, value] of [["topic", next.topic === "all" ? "" : next.topic], ["month", next.month], ["q", next.query]] as const) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.search === window.location.search) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }

  function reset() {
    setFilters({ topic: "all", month: "", query: "" });
  }

  const monthLabel = filters.month ? (archives.find((month) => month.id === filters.month)?.label ?? filters.month) : "";

  return (
    <section className={styles.feed} aria-label="Development updates" data-devblog="feed">
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter by topic">
          <Eyebrow muted as="span" className={styles.toolbarLabel}>
            Topic
          </Eyebrow>
          <ul className={styles.chips}>
            <li data-topic="all">
              <Chip pressed={filters.topic === "all"} count={posts.length} onClick={() => setFilters({ topic: "all" })}>
                All posts
              </Chip>
            </li>
            {BLOG_TOPICS.map((topic) => (
              <li key={topic.id} data-topic={topic.id}>
                <Chip pressed={filters.topic === topic.id} count={topicCounts.get(topic.id)} onClick={() => setFilters({ topic: topic.id })}>
                  {topic.label}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.search} role="search">
          <Field label="Search the devblog">
            <Input
              type="search"
              name="q"
              icon={search01}
              maxLength={160}
              value={filters.query}
              onChange={(event) => setFilters({ query: event.target.value }, true)}
              placeholder="Replication, launcher, Lua…"
              trailing={
                filters.query ? (
                  <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => setFilters({ query: "" }, true)}>
                    <Icon glyph={cancel01} />
                  </button>
                ) : null
              }
            />
          </Field>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.results} data-devblog="results">
          <div className={styles.status}>
            <p role="status" aria-live="polite" aria-atomic="true" className={styles.statusText}>
              <span className={styles.prompt} aria-hidden="true">
                {"//"}
              </span>
              {active ? `${filtered.length} ${filtered.length === 1 ? "post" : "posts"} found` : "Latest post"}
              {monthLabel ? <span className={styles.statusMonth}> / {monthLabel}</span> : null}
            </p>
            {active ? (
              <Button size="sm" color="neutral" lines="none" icon={cancel01} onClick={reset}>
                Reset filters
              </Button>
            ) : null}
          </div>

          {featured ? (
            <>
              <BlogCard post={featured} issue={issues.get(featured.slug)} featured latest={featured.slug === posts[0]?.slug} />
              {byMonth(earlier).map((group) => (
                <section key={group.id} className={styles.month} aria-labelledby={`month-${group.id}`}>
                  <h2 id={`month-${group.id}`} className={styles.monthHead}>
                    <span>{group.label}</span>
                    <span className={styles.monthRule} aria-hidden="true" />
                    <span className={styles.monthCount}>
                      {group.posts.length} {group.posts.length === 1 ? "post" : "posts"}
                    </span>
                  </h2>
                  <div className={styles.grid}>
                    {group.posts.map((post) => (
                      <BlogCard key={post.slug} post={post} issue={issues.get(post.slug)} />
                    ))}
                  </div>
                </section>
              ))}
              <p className={styles.endnote}>
                <span className={styles.prompt} aria-hidden="true">
                  {"// END.OF.FEED"}
                </span>
                {active ? "That's everything matching your filters." : `${posts.length} posts so far, one per working day, straight from the commits.`}
              </p>
            </>
          ) : (
            <div data-devblog="empty">
              <EmptyState
                eyebrow={posts.length ? "// No match" : "// Feed empty"}
                title={posts.length ? "Nothing matches." : "No posts yet. The first one is on its way."}
                action={
                  active ? (
                    <Button color="red" lines="none" border size="sm" icon={arrowRight02} onClick={reset}>
                      Show all posts
                    </Button>
                  ) : null
                }
              >
                {posts.length ? "Try fewer words, another topic, or clear the filters to see every post." : "The daily summaries land on Discord first."}
              </EmptyState>
            </div>
          )}
        </div>

        <aside className={styles.sidebar} aria-label="Devblog information and archives" data-devblog="sidebar">
          <Panel className={styles.side} padding="lg">
            <Eyebrow>{"// Under the hood"}</Eyebrow>
            <Display size="sm" as="h2">
              What this is.
            </Display>
            <p className={styles.sideText}>A post per working day, written from what actually merged. Not a roadmap, not a press release.</p>
            <ul className={styles.points}>
              <li>
                <Icon glyph={code} />
                <span>
                  <strong>Straight from the commits</strong>
                  <small>Replication, the client, the dedicated server, the launcher.</small>
                </span>
              </li>
              <li>
                <Icon glyph={serverStack01} />
                <span>
                  <strong>Written for people who build</strong>
                  <small>API changes and server tooling are called out when they land.</small>
                </span>
              </li>
              <li>
                <Icon glyph={discord} />
                <span>
                  <strong>Short version on Discord</strong>
                  <small>The daily summary lands there first; the full write-up lives here.</small>
                </span>
              </li>
            </ul>
          </Panel>

          <Panel className={styles.side} padding="lg" data-devblog="archive">
            <Eyebrow as="h2">{"// Archive"}</Eyebrow>
            <ul className={styles.archive}>
              {archives.map((month) => (
                <li key={month.id}>
                  <button
                    type="button"
                    className={styles.archiveItem}
                    data-month={month.id}
                    aria-pressed={filters.month === month.id}
                    onClick={() => setFilters({ month: filters.month === month.id ? "" : month.id })}
                  >
                    <span>{month.label}</span>
                    <span className={styles.archiveCount} data-count>
                      {month.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.textLink} data-devblog="archive-reset" onClick={reset}>
              All posts
              <Icon glyph={arrowRight02} />
            </button>
          </Panel>

          <Panel className={styles.side} padding="lg" variant="outline" brackets>
            <Eyebrow>{"// Follow the build"}</Eyebrow>
            <p className={styles.sideText}>The daily summaries hit Discord first. It is also where Alpha feedback and reproducible issues reach the team.</p>
            {site.links.discord ? (
              <Button color="red" lines="none" size="sm" icon={discord} iconPosition="left" href={site.links.discord}>
                Join our Discord
              </Button>
            ) : null}
            <SmartLink href="/docs" className={styles.textLink} glitch>
              Looking for the APIs? Read the docs
            </SmartLink>
          </Panel>
        </aside>
      </div>
    </section>
  );
}
