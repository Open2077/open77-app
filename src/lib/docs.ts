import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Element, Root as HastRoot } from "hast";
import type { Parent, Root as MdastRoot } from "mdast";
import rehypeAutolinkHeadings, {
  type Options as AutolinkOptions,
} from "rehype-autolink-headings";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { createHighlighter } from "shiki";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { openSignalSyntaxTheme, syntaxLanguages } from "@/lib/shiki-theme";
import { site } from "@/lib/site";

/** Guides vendored from the platform wiki by `scripts/sync-wiki.mjs`. */
const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

/**
 * Guides authored in this repository.
 *
 * The wiki is the source of truth for everything that lives next to the code it
 * documents, and `sync-wiki.mjs` deletes anything in `content/docs` the wiki no
 * longer has — so a page written here could not survive there. Some
 * documentation genuinely belongs to the website rather than to the platform
 * checkout: guides assembled from several internal documents, or written for a
 * reader who has no repository to look at. Those live here, are rendered by the
 * same pipeline, and are declared in `meta.json` with `"source": "authored"`.
 */
const AUTHORED_DIR = path.join(process.cwd(), "content", "guides");

/* -------------------------------------------------------------------------- */
/* Navigation metadata                                                        */
/* -------------------------------------------------------------------------- */

export type DocPageKind = "guide" | "page";

/** Which directory a `kind: "guide"` page reads its Markdown from. */
export type DocPageSource = "wiki" | "authored";

export type DocNavPage = {
  slug: string;
  kind: DocPageKind;
  /** Source filename, when it differs from `<slug>.md`. */
  file?: string;
  /** Defaults to `"wiki"`: `content/docs`, written by the sync. */
  source?: DocPageSource;
  nav: string;
  title?: string;
  description: string;
};

/** Absolute path to a guide's Markdown, whichever tree it belongs to. */
function guideFile(page: Pick<DocNavPage, "slug" | "file" | "source">): string {
  const filename = page.file ?? `${page.slug}.md`;
  return path.join(page.source === "authored" ? AUTHORED_DIR : CONTENT_DIR, filename);
}

export type DocNavSection = {
  id: string;
  title: string;
  pages: DocNavPage[];
};

export type DocsNav = { sections: DocNavSection[] };

let navCache: DocsNav | null = null;

export async function getDocsNav(): Promise<DocsNav> {
  if (navCache) return navCache;
  const raw = await readFile(path.join(CONTENT_DIR, "meta.json"), "utf8");
  const parsed = JSON.parse(raw) as DocsNav;
  navCache = { sections: parsed.sections };
  return navCache;
}

/** Flattened page list in sidebar order, used for prev/next and the sitemap. */
export async function getDocsPages(): Promise<(DocNavPage & { section: DocNavSection })[]> {
  const nav = await getDocsNav();
  return nav.sections.flatMap((section) =>
    section.pages.map((page) => ({ ...page, section })),
  );
}

export async function findDocPage(slug: string) {
  const pages = await getDocsPages();
  return pages.find((page) => page.slug === slug) ?? null;
}

/** Site-relative URL for a documentation page. */
export function docHref(slug: string): string {
  return slug === "index" ? "/docs" : `/docs/${slug}`;
}

/** URL of the raw Markdown variant of a documentation page. */
export function docMarkdownHref(slug: string): string {
  return slug === "index" ? "/docs.md" : `/docs/${slug}.md`;
}

/* -------------------------------------------------------------------------- */
/* Provenance                                                                 */
/* -------------------------------------------------------------------------- */

export type DocsManifest = {
  source: string;
  sourcePath: string;
  syncedAt: string;
  guides: number;
  apiEntries: number;
  files: { source: string; slug?: string; title?: string; bytes: number; sha256: string }[];
};

let manifestCache: DocsManifest | null = null;

export async function getDocsManifest(): Promise<DocsManifest> {
  if (manifestCache) return manifestCache;
  const raw = await readFile(path.join(CONTENT_DIR, "_manifest.json"), "utf8");
  manifestCache = JSON.parse(raw) as DocsManifest;
  return manifestCache;
}

/* -------------------------------------------------------------------------- */
/* Markdown rendering                                                         */
/* -------------------------------------------------------------------------- */

export type TocEntry = { id: string; text: string; depth: number };

export type RenderedGuide = {
  slug: string;
  /** Sidebar label. */
  nav: string;
  /** Page title: the metadata override, else the source `# ` heading. */
  title: string;
  description: string;
  sectionTitle: string;
  html: string;
  toc: TocEntry[];
  markdown: string;
  wordCount: number;
  readingMinutes: number;
};

/**
 * Rewrites the wiki's relative links for the web.
 *
 * Inside the wiki, guides link to each other as `vehicles.md#seats`, which
 * becomes `/docs/vehicles#seats` here. Links that escape the wiki directory
 * (`../docs/...`, `../LICENSE`) have no page on this site and are handled by
 * `replaceWithRepoReference`.
 */
function remarkRewriteWikiLinks() {
  return (tree: MdastRoot) => {
    visit(tree, "link", (node, index, parent) => {
      const url = node.url;
      // `/docs/api` is already a site URL. Without this it would fall through
      // to the repository-reference branch below and be rewritten to the
      // nonsense path `wiki//docs/api`, because that branch assumes anything
      // not ending in `.md` is a file inside the wiki directory.
      if (!url || /^(https?:|mailto:|#|\/)/.test(url)) return;

      const [targetRaw, hash] = splitHash(url);
      const suffix = hash ? `#${hash}` : "";

      // Escapes the wiki directory: `../LICENSE`, `../docs/vehicle-models.md`.
      if (targetRaw.startsWith("../") || targetRaw.startsWith("./../")) {
        const repoPath = path.posix.normalize(path.posix.join("wiki", targetRaw));
        replaceWithRepoReference(node, index, parent, repoPath, suffix);
        return;
      }

      const target = targetRaw.replace(/^\.\//, "");
      if (target.endsWith(".md")) {
        const slug = target.slice(0, -3);
        node.url = `${docHref(slug === "README" ? "index" : slug)}${suffix}`;
        return;
      }

      if (target === "") {
        node.url = suffix || "#";
        return;
      }

      // Anything else is a path inside the wiki that is not a guide: a
      // directory, a generator script, a CSV.
      replaceWithRepoReference(node, index, parent, `wiki/${target}`, suffix);
    });
  };
}

/**
 * Resolves a link that points into the platform repository.
 *
 * While `platformRepo` is null the repository is not public, so linking to it
 * would put a guaranteed 404 in the middle of a guide. The link is replaced by
 * the repository-relative path as inline code instead: the reader still learns
 * exactly which file is meant, and nothing promises a page that isn't there.
 */
function replaceWithRepoReference(
  node: { url: string },
  index: number | undefined,
  parent: Parent | undefined,
  repoPath: string,
  suffix: string,
) {
  if (site.links.platformRepo) {
    node.url = `${site.links.platformRepo}/blob/main/${repoPath}${suffix}`;
    return;
  }
  if (!parent || index === undefined) return;
  parent.children[index] = { type: "inlineCode", value: repoPath };
}

function splitHash(url: string): [string, string | undefined] {
  const index = url.indexOf("#");
  if (index === -1) return [url, undefined];
  return [url.slice(0, index), url.slice(index + 1)];
}

/**
 * Collects the heading outline after `rehype-slug` has assigned ids, so the
 * table of contents and the anchors can never disagree.
 */
function rehypeCollectToc(collected: TocEntry[]) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      const depth = { h2: 2, h3: 3 }[node.tagName];
      if (!depth) return;
      const id = typeof node.properties?.id === "string" ? node.properties.id : null;
      if (!id) return;
      collected.push({ id, text: textOf(node), depth });
    });
  };
}

/**
 * Wraps every table in its own scroll container.
 *
 * The wiki's reference tables are wide — the game data tables have eight
 * columns — and without a wrapper the overflow lands on the page, which breaks
 * the sticky sidebar and produces a horizontally scrolling document on a phone.
 */
export function rehypeWrapTables() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;
      if (parent.type === "element" && parent.tagName === "div") return;
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["dx-table-wrap"] },
        children: [node],
      };
    });
  };
}

function textOf(node: Element): string {
  let out = "";
  visit(node, "text", (child) => {
    out += child.value;
  });
  return out.trim();
}

/** Drops the leading `# ` heading: the page renders its own title element. */
function remarkStripLeadingHeading(captured: { title?: string }) {
  return (tree: MdastRoot) => {
    const first = tree.children[0];
    if (first && first.type === "heading" && first.depth === 1) {
      captured.title = mdastText(first);
      tree.children.shift();
    }
  };
}

function mdastText(node: unknown): string {
  let out = "";
  visit(node as MdastRoot, "text", (child) => {
    out += child.value;
  });
  return out.trim();
}

/**
 * One highlighter for the whole build.
 *
 * Creating it loads and compiles every grammar in `syntaxLanguages`, which is
 * the expensive part; a single instance is shared across all 60-odd prerendered
 * pages instead of paying that cost per page.
 */
let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

export function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [openSignalSyntaxTheme],
      langs: [...syntaxLanguages],
    });
  }
  return highlighterPromise;
}

/**
 * Heading anchors.
 *
 * Appended rather than wrapped so the heading text is not itself a link — the
 * whole-heading-is-a-link pattern makes every heading a tab stop and reads badly
 * to a screen reader. The `#` is hidden from assistive technology and given a
 * label instead, and `tabIndex: -1` keeps it out of the tab order.
 */
export const AUTOLINK_OPTIONS: AutolinkOptions = {
  behavior: "append",
  properties: { className: ["doc-anchor"], ariaHidden: "true", tabIndex: -1 },
  content: [{ type: "text", value: "#" }],
};

const guideCache = new Map<string, Promise<RenderedGuide | null>>();

export function getGuide(slug: string): Promise<RenderedGuide | null> {
  const cached = guideCache.get(slug);
  if (cached) return cached;
  const promise = renderGuide(slug);
  guideCache.set(slug, promise);
  return promise;
}

async function renderGuide(slug: string): Promise<RenderedGuide | null> {
  const meta = await findDocPage(slug);
  if (!meta || meta.kind !== "guide") return null;

  const markdown = await readFile(guideFile(meta), "utf8");

  const toc: TocEntry[] = [];
  const captured: { title?: string } = {};
  const highlighter = await getHighlighter();

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStripLeadingHeading, captured)
    .use(remarkRewriteWikiLinks)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeAutolinkHeadings, AUTOLINK_OPTIONS)
    .use(rehypeWrapTables)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: "open-signal",
      fallbackLanguage: "text",
      addLanguageClass: true,
    })
    .use(rehypeStringify)
    .process(markdown);

  const wordCount = countWords(markdown);

  return {
    slug,
    nav: meta.nav,
    title: meta.title ?? captured.title ?? meta.nav,
    description: meta.description,
    sectionTitle: meta.section.title,
    html: String(file),
    toc,
    markdown,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / 220)),
  };
}

/** Approximate prose length, with fenced code blocks excluded. */
export function countWords(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ");
  const matches = prose.match(/[A-Za-z0-9][A-Za-z0-9'’_-]*/g);
  return matches ? matches.length : 0;
}

/** Raw Markdown of a guide, as served to LLM and agent clients. */
export async function getGuideMarkdown(slug: string): Promise<string | null> {
  const meta = await findDocPage(slug);
  if (!meta || meta.kind !== "guide") return null;
  return readFile(guideFile(meta), "utf8");
}

/**
 * Highlights a standalone snippet with the same theme the guides use.
 *
 * Exists so hand-written pages can show real code without a second
 * highlighting mechanism drifting away from the documentation's.
 */
export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    theme: "open-signal",
  });
}

/* -------------------------------------------------------------------------- */
/* Navigation helpers                                                         */
/* -------------------------------------------------------------------------- */

export type DocsNeighbours = {
  previous: { label: string; href: string } | null;
  next: { label: string; href: string } | null;
};

/** Sidebar-order neighbours, so a reader can walk the docs without the sidebar. */
export async function getDocsNeighbours(slug: string): Promise<DocsNeighbours> {
  const pages = await getDocsPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) return { previous: null, next: null };

  const at = (position: number) => {
    const page = pages[position];
    return page ? { label: page.nav, href: docHref(page.slug) } : null;
  };

  return { previous: at(index - 1), next: at(index + 1) };
}

/**
 * Lightweight index for the client-side guide filter.
 *
 * Titles, descriptions and section names only. A full-text index over every
 * guide would be several hundred kilobytes of JavaScript payload to make 21
 * pages searchable, which is a bad trade; the raw Markdown endpoints and
 * `llms-full.txt` already cover the case where something needs the whole text.
 */
export type DocsSearchEntry = {
  title: string;
  nav: string;
  description: string;
  section: string;
  href: string;
  kind: DocPageKind;
};

export async function getDocsSearchIndex(): Promise<DocsSearchEntry[]> {
  const pages = await getDocsPages();
  return pages.map((page) => ({
    title: page.title ?? page.nav,
    nav: page.nav,
    description: page.description,
    section: page.section.title,
    href: docHref(page.slug),
    kind: page.kind,
  }));
}
