import type { CSSProperties } from "react";

import { cx } from "@/components/ui/cx";
import type { BlogPostMeta } from "@/lib/devblog";
import { postTopics } from "@/lib/devblog-presentation";

import styles from "./blog-cover.module.css";

/** Deterministic 0..1 values from the slug: the post's own "signal". */
function signature(slug: string, count: number): number[] {
  let hash = 2166136261;
  const values: number[] = [];
  for (let index = 0; index < count; index++) {
    for (const char of `${slug}:${index}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    values.push(0.18 + ((hash % 1000) / 1000) * 0.82);
  }
  return values;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The cover of a post, drawn rather than illustrated: the day of publication
 * as a giant outlined numeral, the topic, the issue number and a bar signature
 * generated from the slug. Posts are editorial; they never borrow key art that
 * would misrepresent their subject.
 */
export function BlogCover({
  post,
  issue,
  variant = "card",
  className,
}: {
  post: BlogPostMeta;
  /** Running number of the post, oldest = 1. */
  issue?: number;
  variant?: "featured" | "card" | "article";
  className?: string;
}) {
  const [year, month, day] = post.date.split("-");
  const topic = postTopics(post)[0];
  const bars = signature(post.slug, variant === "card" ? 18 : 28);
  const numeral = String(Number(day ?? "1")).padStart(2, "0");
  return (
    <div className={cx(styles.cover, styles[variant], className)} aria-hidden="true">
      <span className={styles.grid} />
      <span className={styles.top}>
        <span>
          {MONTHS[Number(month) - 1] ?? month} {year}
        </span>
        {issue !== undefined ? <span className={styles.issue}>No.{String(issue).padStart(3, "0")}</span> : null}
      </span>
      {topic ? <span className={styles.topic}>{`// ${topic.label}`}</span> : null}
      <span className={styles.numeral} data-glitch={variant === "featured" ? numeral : undefined}>
        {numeral}
      </span>
      <span className={styles.signal}>
        {bars.map((value, index) => (
          <span key={index} style={{ "--h": value } as CSSProperties} />
        ))}
      </span>
    </div>
  );
}
