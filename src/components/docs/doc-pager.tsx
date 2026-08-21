import Link from "next/link";

import type { DocsNeighbours } from "@/lib/docs";

export function DocPager({ previous, next }: DocsNeighbours) {
  if (!previous && !next) return null;

  return (
    <nav className="dx-pager" aria-label="Adjacent pages">
      {previous ? (
        <Link className="dx-pager-link" href={previous.href} rel="prev">
          <span className="dx-pager-dir">Previous</span>
          <span className="dx-pager-label">{previous.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className="dx-pager-link dx-pager-next" href={next.href} rel="next">
          <span className="dx-pager-dir">Next</span>
          <span className="dx-pager-label">{next.label}</span>
        </Link>
      ) : null}
    </nav>
  );
}
