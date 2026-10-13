"use client";

import { useEffect, useState } from "react";

import styles from "./post.module.css";

type Heading = { id: string; title: string };

/** "In this article": links to the post's sections, the one being read is marked. */
export function PostToc({ headings }: { headings: Heading[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const targets = headings.map((heading) => document.getElementById(heading.id)).filter((node): node is HTMLElement => !!node);
    if (!targets.length) return;
    let frame = 0;
    // The section being read is the last heading above the upper third of the viewport.
    const measure = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let active: string | null = null;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= line) active = target.id;
        else break;
      }
      setCurrent(active);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [headings]);
  return (
    <nav className={styles.toc} aria-label="In this article" data-devblog="toc">
      <h2 className={styles.toolsLabel}>
        <span aria-hidden="true">{"// "}</span>In this article
      </h2>
      <ol>
        {headings.map((heading, index) => (
          <li key={heading.id}>
            <a href={`#${heading.id}`} aria-current={current === heading.id ? "location" : undefined}>
              <span className={styles.tocIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {heading.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
