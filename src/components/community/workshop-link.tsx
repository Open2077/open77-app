import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { arrowUpRight01, bug01, globe02, sourceCode } from "@/components/ui/icons";

import styles from "./workshop-link.module.css";

const GLYPHS = { source: sourceCode, issues: bug01, web: globe02 } as const;

/**
 * A link a creator supplied (source, tracker, profile links). It leaves the
 * site in a new tab and is marked as user content, so it passes no ranking.
 * Pass only URLs already checked with `safeHttpUrl`.
 */
export function UserLink({ href, kind = "web", children }: { href: string; kind?: keyof typeof GLYPHS; children: ReactNode }) {
  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
      <Icon glyph={GLYPHS[kind]} />
      {children}
      <Icon glyph={arrowUpRight01} className={styles.out} />
    </a>
  );
}
