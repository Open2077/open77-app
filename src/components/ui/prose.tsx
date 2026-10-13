import type { ReactNode } from "react";

import { cx } from "./cx";

import styles from "./prose.module.css";

/**
 * Long-form typography for rendered Markdown and articles (docs, devblog,
 * workshop readmes). Style the raw HTML elements inside; pass rendered HTML
 * through `html`, or JSX through `children`.
 */
export function Prose({
  html,
  children,
  size = "md",
  className,
  ...data
}: {
  html?: string;
  children?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  const classes = cx(styles.prose, size === "sm" && styles.sm, className);
  if (html !== undefined) return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} {...data} />;
  return (
    <div className={classes} {...data}>
      {children}
    </div>
  );
}
