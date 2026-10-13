"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Page } from "@/components/ui/page";
import { toneForPath } from "@/lib/tone";
import { DocsSearch, type SearchEntry } from "./docs-search";

import styles from "./docs-frame.module.css";

/**
 * Every documentation page: the page tone of its audience (red for the
 * developer docs, blue for the hosting guides) and the Ctrl / ⌘ K search,
 * mounted once for the whole section. The site header and footer come from
 * the root layout.
 */
export function DocsFrame({ entries, children }: { entries: SearchEntry[]; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Page tone={toneForPath(pathname)} className={styles.frame}>
      {children}
      <DocsSearch entries={entries} />
    </Page>
  );
}
