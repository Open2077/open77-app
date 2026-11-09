import type { ReactNode } from "react";

import { Display, Eyebrow } from "@/components/ui/typography";

import styles from "./resource.module.css";

/** One numbered block of a Workshop item page: "01 // About", its body below a hairline. */
export function Block({
  index,
  label,
  title,
  id,
  aside,
  children,
}: {
  index?: number;
  label: string;
  title: string;
  id?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.block} id={id} aria-label={title}>
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <Eyebrow index={index}>{label}</Eyebrow>
          <Display as="h2" size="md">
            {title}
          </Display>
        </div>
        {aside ? <div className={styles.headAside}>{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}
