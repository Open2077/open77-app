import Link from "next/link";

import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { arrowRight02 } from "@/components/ui/icons";
import { Display } from "@/components/ui/typography";
import type { BlogPostMeta } from "@/lib/devblog";
import { blogDate, postTopics } from "@/lib/devblog-presentation";
import { BlogCover } from "./blog-cover";

import styles from "./blog-card.module.css";

export function BlogCard({
  post,
  issue,
  featured = false,
  latest = false,
}: {
  post: BlogPostMeta;
  issue?: number;
  featured?: boolean;
  latest?: boolean;
}) {
  return (
    <article
      className={cx(styles.card, featured && styles.featured)}
      data-devblog={featured ? "card featured" : "card"}
      data-post-date={post.date}
    >
      <Link href={`/devblog/${post.slug}`} className={styles.link} data-devblog="card-link">
        <BlogCover post={post} issue={issue} variant={featured ? "featured" : "card"} className={styles.cover} />
        <div className={styles.copy}>
          <p className={styles.meta}>
            {latest ? (
              <span className={styles.latest} data-devblog="latest">
                Latest
              </span>
            ) : null}
            <time dateTime={post.date}>{blogDate(post.date)}</time>
            <span>{post.readingMinutes} min read</span>
          </p>
          <Display as="h3" size={featured && post.title.length <= 44 ? "md" : "sm"} className={styles.title}>
            {post.title}
          </Display>
          <p className={styles.description}>{post.description}</p>
          <div className={styles.foot}>
            <span className={styles.topics}>
              {postTopics(post)
                .slice(0, 3)
                .map((topic) => (
                  <Tag key={topic.id} tone="neutral">
                    {topic.label}
                  </Tag>
                ))}
            </span>
            <span className={styles.read}>
              {featured ? <span>Read the post</span> : null}
              <Icon glyph={arrowRight02} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
