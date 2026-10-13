import type { ReactNode } from "react";

import { cx } from "./cx";

import styles from "./container.module.css";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.container, className)}>{children}</div>;
}
