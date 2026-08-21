import type { TocEntry } from "@/lib/docs";

/**
 * The heading outline.
 *
 * Static markup with no scroll-spy: the ids come from the same `rehype-slug`
 * pass that produced the anchors, so the links cannot drift from the document,
 * and highlighting the section you are looking at is not worth shipping a
 * scroll listener for.
 */
export function DocToc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <ul className="dx-toc-list">
      {entries.map((entry) => (
        <li className={`dx-toc-depth-${entry.depth}`} key={entry.id}>
          <a href={`#${entry.id}`}>{entry.text}</a>
        </li>
      ))}
    </ul>
  );
}
