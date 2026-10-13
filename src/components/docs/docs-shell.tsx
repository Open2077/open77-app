import Image from "next/image";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/ui/data";
import { Lead } from "@/components/ui/typography";
import { docHref, getDocsNav, type TocEntry } from "@/lib/docs";
import { DocTitle } from "./doc-title";
import { DocTocAside, DocTocInline } from "./doc-toc";
import { DocsNav, type DocsNavGroup } from "./docs-nav";

import styles from "./docs-shell.module.css";

/**
 * Builds the sidebar tree.
 *
 * `meta.json` is the source of truth for guide categories. The dedicated API
 * explorer owns its namespace and runtime navigation.
 */
async function buildNavGroups(): Promise<DocsNavGroup[]> {
  const nav = await getDocsNav();

  return nav.sections.map((section) => ({
    id: section.id,
    title: section.title,
    group: section.group,
    items: section.pages.map((page) => ({
      href: docHref(page.slug),
      label: page.nav,
    })),
  }));
}

export type Breadcrumb = { label: string; href?: string };

/** Key art behind the top of the page, in the colour of its audience. */
const ART = {
  red: "/home/img/devs-bg.webp",
  blue: "/home/img/creators-bg.webp",
} as const;

/**
 * The documentation page frame: sidebar, title block, body and the outline.
 * Pages without headings worth listing pass no `toc`, which collapses the grid
 * to two columns instead of leaving a dead gutter.
 */
export async function DocsShell({
  breadcrumbs,
  eyebrow,
  title,
  titleMax,
  titleVerbatim = false,
  lede,
  meta,
  toc,
  tone = "red",
  children,
}: {
  breadcrumbs: Breadcrumb[];
  /** The label above the title: the section, the runtime. */
  eyebrow?: ReactNode;
  title: string;
  /** Longest title line, in characters, before it breaks. */
  titleMax?: number;
  /** Keeps the title's case (API namespaces). */
  titleVerbatim?: boolean;
  lede?: ReactNode;
  /** Reading facts and related links, under the lede. */
  meta?: ReactNode;
  toc?: TocEntry[];
  tone?: "red" | "blue";
  children: ReactNode;
}) {
  const groups = await buildNavGroups();
  const hasToc = Boolean(toc && toc.length > 0);

  return (
    <div className={hasToc ? styles.shell : `${styles.shell} ${styles.noToc}`}>
      <div className={styles.art} aria-hidden="true">
        {/* The page's largest paint on first view: fetched early. */}
        <Image src={ART[tone]} alt="" fill sizes="100vw" quality={75} preload />
      </div>

      <div className={styles.side}>
        <DocsNav groups={groups} />
      </div>

      <article className={styles.main}>
        <header className={styles.head}>
          {/* Location and section share one row: the title, then the text, come up sooner. */}
          <div className={styles.kicker}>
            <Breadcrumbs items={breadcrumbs} className={styles.crumbs} />
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          </div>
          <DocTitle title={title} max={titleMax} verbatim={titleVerbatim} />
          {lede ? <Lead className={styles.lede}>{lede}</Lead> : null}
          {meta ? (
            <div className={styles.meta} data-docs-meta>
              {meta}
            </div>
          ) : null}
        </header>
        {hasToc ? <DocTocInline entries={toc!} /> : null}
        <div className={styles.body}>{children}</div>
      </article>

      {hasToc ? (
        <div className={styles.outline}>
          <DocTocAside entries={toc!} />
        </div>
      ) : null}
    </div>
  );
}
