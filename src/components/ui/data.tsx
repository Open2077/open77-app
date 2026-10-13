import NextLink from "next/link";
import { Fragment, type ReactNode } from "react";

import { cx } from "./cx";

import styles from "./data.module.css";

/**
 * A data table: Nippo column heads, hairline rows, horizontal scroll on narrow
 * screens. Write plain <thead>/<tbody>/<tr>/<th>/<td> inside; add
 * `data-numeric` on cells that hold numbers to right-align them.
 */
export function Table({
  children,
  caption,
  dense = false,
  className,
}: {
  children: ReactNode;
  /** Accessible title of the table, visually hidden. */
  caption?: string;
  dense?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(styles.tableWrap, className)}>
      <table className={cx(styles.table, dense && styles.dense)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

/** Where the page sits: "Docs / Hosting / Licensing". */
export function Breadcrumbs({ items, className }: { items: Array<{ label: string; href?: string }>; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cx(styles.crumbs, className)}>
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !last ? (
                  <NextLink href={item.href}>{item.label}</NextLink>
                ) : (
                  <span aria-current={last ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {!last ? (
                <li aria-hidden="true" className={styles.separator}>
                  {"//"}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** A user or creator mark: their picture, or their initials on a skewed tile. */
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className={cx(styles.avatar, className)} style={{ width: size, height: size }} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatars from arbitrary hosts
        <img src={src} alt="" width={size} height={size} loading="lazy" />
      ) : (
        <span className={styles.initials} style={{ fontSize: size * 0.36 }}>
          {initials}
        </span>
      )}
    </span>
  );
}

/** Label / value pairs: server facts, account details, release metadata. */
export function DefinitionList({
  items,
  className,
  columns = 1,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl className={cx(styles.dl, styles[`cols-${columns}`], className)}>
      {items.map((item, index) => (
        <div key={index} className={styles.dlRow}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
