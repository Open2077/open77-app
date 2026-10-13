"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cx } from "./cx";

import styles from "./tabs.module.css";

type TabItem = { label: ReactNode; count?: number } & ({ href: string; value?: never } | { value: string; href?: never });

/**
 * A row of slanted tabs. Link items mark the current route; value items act
 * as a segmented control (`value` / `onChange`).
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
  exact = false,
  ...data
}: {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
  /** Link items match only their exact path (not sub-paths). */
  exact?: boolean;
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  const pathname = usePathname();
  return (
    <nav className={cx(styles.tabs, className)} aria-label={label} {...data}>
      <ul className={styles.list}>
        {items.map((item) => {
          if (item.href) {
            const current = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <NextLink href={item.href} className={styles.tab} aria-current={current ? "page" : undefined}>
                  {item.label}
                  {item.count !== undefined ? <span className={styles.count}>{item.count}</span> : null}
                </NextLink>
              </li>
            );
          }
          const selected = item.value === value;
          return (
            <li key={item.value}>
              <button
                type="button"
                className={styles.tab}
                aria-pressed={selected}
                onClick={() => item.value && onChange?.(item.value)}
              >
                {item.label}
                {item.count !== undefined ? <span className={styles.count}>{item.count}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
