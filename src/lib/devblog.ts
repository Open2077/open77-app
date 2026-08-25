import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Root as MdastRoot } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import {
  AUTOLINK_OPTIONS,
  countWords,
  getHighlighter,
  rehypeWrapTables,
} from "@/lib/docs";

/**
 * The devblog content pipeline.
 *
 * Posts are Markdown files committed into `content/devblog/` — by hand or,
 * daily, by the digest service on the master server through the GitHub
 * Contents API. Every commit triggers a fresh production build, so the pages
 * are fully static: this module reads the directory at build time and nothing
 * here runs per request.
 *
 * The file contract (shared with the digest generator — do not change one
 * side without the other):
 *
 *   content/devblog/YYYY-MM-DD-<kebab-slug>.md
 *   ---
 *   title: "…"            ← values are JSON-encoded, one per line
 *   date: "YYYY-MM-DD"
 *   description: "…"
 *   tags: ["…", "…"]
 *   ---
 *   Markdown body, `##` headings and below.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "devblog");

const FILENAME = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

export type BlogPostMeta = {
  /** URL segment: the filename without `.md`, date prefix included. */
  slug: string;
  title: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  description: string;
  tags: string[];
  readingMinutes: number;
};

export type BlogPost = BlogPostMeta & {
  html: string;
  markdown: string;
  wordCount: number;
};

export function blogHref(slug: string): string {
  return `/devblog/${slug}`;
}

/** URL of the raw Markdown variant, for LLM and agent clients. */
export function blogMarkdownHref(slug: string): string {
  return `/devblog/${slug}.md`;
}

/** `25 Aug 2026` — compact, unambiguous, and consistent across the site. */
export function formatBlogDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Parses the JSON-encoded frontmatter block.
 *
 * The digest generator emits every value as a JSON literal on a single line,
 * which is also valid YAML — but parsing it as JSON means no YAML dependency
 * and no YAML edge cases. A malformed file throws with its name in the
 * message, failing the build rather than shipping a half-parsed post.
 */
function parseFrontmatter(raw: string, filename: string): {
  meta: Record<string, unknown>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const block = match?.[1];
  if (!match || block === undefined) throw new Error(`${filename}: missing frontmatter block`);

  const meta: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`${filename}: bad frontmatter line: ${line}`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    try {
      meta[key] = JSON.parse(value);
    } catch {
      throw new Error(`${filename}: frontmatter value for "${key}" is not JSON: ${value}`);
    }
  }
  return { meta, body: raw.slice(match[0].length) };
}

function toMeta(
  slug: string,
  meta: Record<string, unknown>,
  body: string,
  filename: string,
): BlogPostMeta {
  const { title, date, description, tags } = meta;
  if (typeof title !== "string" || typeof date !== "string" || typeof description !== "string") {
    throw new Error(`${filename}: frontmatter must have string title, date and description`);
  }
  return {
    slug,
    title,
    date,
    description,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
    readingMinutes: Math.max(1, Math.round(countWords(body) / 220)),
  };
}

let postsCache: Promise<BlogPostMeta[]> | null = null;

/** All posts, newest first. The date-prefixed filenames make that a sort. */
export function getBlogPosts(): Promise<BlogPostMeta[]> {
  if (!postsCache) postsCache = listPosts();
  return postsCache;
}

async function listPosts(): Promise<BlogPostMeta[]> {
  let entries: string[];
  try {
    entries = await readdir(CONTENT_DIR);
  } catch {
    return []; // No posts yet: the index renders its empty state.
  }

  const posts = await Promise.all(
    entries
      .filter((name) => FILENAME.test(name))
      .map(async (name) => {
        const raw = await readFile(path.join(CONTENT_DIR, name), "utf8");
        const { meta, body } = parseFrontmatter(raw, name);
        return toMeta(name.slice(0, -3), meta, body, name);
      }),
  );

  return posts.sort((a, b) => b.slug.localeCompare(a.slug));
}

/** Drops a leading `# ` heading: the page renders the frontmatter title. */
function remarkStripLeadingHeading() {
  return (tree: MdastRoot) => {
    const first = tree.children[0];
    if (first && first.type === "heading" && first.depth === 1) tree.children.shift();
  };
}

const postCache = new Map<string, Promise<BlogPost | null>>();

export function getBlogPost(slug: string): Promise<BlogPost | null> {
  const cached = postCache.get(slug);
  if (cached) return cached;
  const promise = renderPost(slug);
  postCache.set(slug, promise);
  return promise;
}

async function renderPost(slug: string): Promise<BlogPost | null> {
  const filename = `${slug}.md`;
  if (!FILENAME.test(filename)) return null;

  let raw: string;
  try {
    raw = await readFile(path.join(CONTENT_DIR, filename), "utf8");
  } catch {
    return null;
  }

  const { meta, body } = parseFrontmatter(raw, filename);
  const highlighter = await getHighlighter();

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStripLeadingHeading)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, AUTOLINK_OPTIONS)
    .use(rehypeWrapTables)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: "open-signal",
      fallbackLanguage: "text",
      addLanguageClass: true,
    })
    .use(rehypeStringify)
    .process(body);

  return {
    ...toMeta(slug, meta, body, filename),
    html: String(file),
    markdown: raw,
    wordCount: countWords(body),
  };
}

/** Raw Markdown of a post, as served to LLM and agent clients. */
export async function getBlogPostMarkdown(slug: string): Promise<string | null> {
  if (!FILENAME.test(`${slug}.md`)) return null;
  try {
    return await readFile(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
}
