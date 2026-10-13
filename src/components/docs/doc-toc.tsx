import { cx } from "@/components/ui/cx";
import type { TocEntry } from "@/lib/docs";

import styles from "./doc-toc.module.css";

/**
 * The heading outline.
 *
 * Static markup with no scroll-spy: the ids come from the same `rehype-slug`
 * pass that produced the anchors, so the links cannot drift from the document,
 * and highlighting the section you are looking at is not worth shipping a
 * scroll listener for.
 */
export function DocToc({ entries, className }: { entries: TocEntry[]; className?: string }) {
  if (entries.length === 0) return null;

  return (
    <ul className={cx(styles.list, className)}>
      {entries.map((entry) => (
        <li className={entry.depth > 2 ? styles.sub : undefined} key={entry.id}>
          <a href={`#${entry.id}`}>{entry.text}</a>
        </li>
      ))}
    </ul>
  );
}

/** The outline in the right-hand column of wide screens. */
export function DocTocAside({ entries }: { entries: TocEntry[] }) {
  return (
    <aside className={styles.aside} aria-label="On this page">
      <p className={styles.title}>On this page</p>
      <DocToc entries={entries} />
      <a className={styles.top} href="#main">
        Back to top
      </a>
    </aside>
  );
}

/** The same outline, folded under the title where there is no third column. */
export function DocTocInline({ entries }: { entries: TocEntry[] }) {
  const sections = entries.filter((entry) => entry.depth === 2).length || entries.length;
  return (
    <details className={styles.inline}>
      <summary>
        <span>On this page</span>
        <span className={styles.count}>
          {sections} {sections === 1 ? "section" : "sections"}
        </span>
      </summary>
      <DocToc entries={entries} />
    </details>
  );
}
