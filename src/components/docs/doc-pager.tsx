import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { arrowLeft02, arrowRight02 } from "@/components/ui/icons";
import type { DocsNeighbours } from "@/lib/docs";

import styles from "./doc-pager.module.css";

/** The previous and next guides in sidebar order, so the docs read front to back. */
export function DocPager({ previous, next }: DocsNeighbours) {
  if (!previous && !next) return null;

  return (
    <nav className={styles.pager} aria-label="Adjacent pages">
      {previous ? (
        <Link className={styles.link} href={previous.href} rel="prev">
          <span className={styles.dir}>
            <Icon glyph={arrowLeft02} />
            Previous
          </span>
          <span className={styles.label}>{previous.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className={`${styles.link} ${styles.next}`} href={next.href} rel="next">
          <span className={styles.dir}>
            Next
            <Icon glyph={arrowRight02} />
          </span>
          <span className={styles.label}>{next.label}</span>
        </Link>
      ) : null}
    </nav>
  );
}
