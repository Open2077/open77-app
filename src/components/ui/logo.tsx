import { forwardRef } from "react";

import { cx } from "./cx";
import { LOGO_PATHS } from "./svg-data";

import styles from "./logo.module.css";

/** The OPEN//77 wordmark. Its slashes follow the active scene colour. */
export const Logo = forwardRef<HTMLDivElement, { className?: string }>(function Logo({ className }, ref) {
  return (
    <div ref={ref} data-logo-header className={cx(styles.logo, className)}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1219 149">
        <title>Open//2077</title>
        <path d={LOGO_PATHS[0]} fill="var(--active-color)" />
        <path d={LOGO_PATHS[1]} fill="currentColor" />
      </svg>
    </div>
  );
});
