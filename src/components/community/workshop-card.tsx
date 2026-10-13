"use client";

import Image from "next/image";
import Link from "next/link";
import { Children, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { arrowUp01, download02, play } from "@/components/ui/icons";
import { Marquee } from "@/components/ui/marquee";
import { formatCount, formatDate } from "@/lib/community/format";
import { categories, categoryLabel, type CommunityProject } from "@/lib/community/types";
import { useHoverPreview } from "./use-hover-media";
import { WorkshopIcon } from "./workshop-icon";

import styles from "./workshop-card.module.css";

/** Cards keep a few lines of summary; the page carries the rest. Cut on a word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** The category mark drawn huge and outlined when a creation has no picture yet. */
export function CategoryPlaceholder({ category, className }: { category: string; className?: string }) {
  const mark = categories.find(item => item.id === category)?.mark ?? "//";
  return (
    <span className={cx(styles.placeholder, className)} aria-hidden="true">
      <span className={styles.placeholderMark}>{mark}</span>
      <WorkshopIcon category={category} size={34} className={styles.placeholderIcon} />
    </span>
  );
}

/**
 * One creation, as the home page sets its server cards: a parallelogram of key
 * art with the copy riding its slanted edge. Under the pointer the art plays the
 * hover clip (or cycles the screenshots), the frame thickens and the title runs
 * as a marquee. The whole card is one link; `actions` sit above it.
 *
 * `feature` is the editorial spotlight: taller, with tags and a call to action.
 */
export function WorkshopCard({
  project,
  cover,
  variant = "tile",
  rank,
  actions,
  eager = false,
  selected = false,
  headingLevel = 3,
}: {
  project: CommunityProject;
  /** URL of the cover derivative, resolved by the caller. */
  cover: string | null;
  variant?: "tile" | "feature";
  /** Position in a ranked shelf, drawn as a large outlined number. */
  rank?: number;
  actions?: ReactNode;
  eager?: boolean;
  /** Open in a quick view next to the list. */
  selected?: boolean;
  headingLevel?: 2 | 3;
}) {
  const { content } = project;
  const [hovering, setHovering] = useState(false);
  const preview = useHoverPreview(content.media, content.clipMediaId, hovering);
  const href = `/workshop/${project.slug}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const shown = preview?.kind === "image" ? preview.src : cover;
  const status = content.kind === "showcase" ? "Showcase" : content.maturity === "stable" ? "Stable" : "Experimental";
  return (
    <article
      className={cx(styles.card, styles[variant], hovering && styles.hover, rank ? styles.ranked : undefined)}
      data-workshop-card
      data-category={content.category}
      data-selected={selected || undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span className={styles.slant} aria-hidden="true" />
      <Link className={styles.cover} href={href} tabIndex={-1} aria-hidden="true">
        <span className={styles.bg}>
        {preview?.kind === "video" ? (
          <video src={preview.src} poster={preview.poster ?? cover ?? undefined} muted autoPlay loop playsInline preload="none" />
        ) : shown ? (
          <Image
            key={shown}
            unoptimized
            src={shown}
            width={960}
            height={540}
            alt=""
            loading={eager ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
          />
        ) : (
          <CategoryPlaceholder category={content.category} />
        )}
        </span>
      </Link>
      {rank ? (
        <span className={styles.rank} aria-hidden="true">
          {String(rank).padStart(2, "0")}
        </span>
      ) : null}
      <div className={styles.content}>
        <p className={styles.sub}>
          {/* Spaces between the labels are the line-break opportunities beside the slant. */}
          {variant === "feature" ? <><span className={styles.flag}>Featured</span>{" "}</> : null}
          <span>{categoryLabel(content.category)}</span>{" "}
          <span className={cx(styles.status, status === "Stable" && styles.stable)}>{status}</span>{" "}
          {content.clipMediaId ? (
            <span className={styles.clip}>
              <Icon glyph={play} />
              Clip
            </span>
          ) : null}
        </p>
        <div className={styles.titleBlock}>
          <Heading className={styles.title}>
            <Link className={styles.link} href={href}>
              {content.title}
            </Link>
          </Heading>
          {hovering ? (
            <div className={styles.marquee} aria-hidden="true">
              <Marquee pauseOnHover={false}>
                <>{content.title}&nbsp;//&nbsp;</>
              </Marquee>
            </div>
          ) : null}
        </div>
        <p className={styles.author}>
          {project.creatorHandle ? (
            <Link className={styles.authorLink} href={`/workshop/creators/${project.creatorHandle}`}>
              by @{project.creatorHandle}
            </Link>
          ) : (
            "Community creator"
          )}
        </p>
        <p className={styles.summary}>{clip(content.summary, variant === "feature" ? 260 : 140) || "No summary yet."}</p>
        {variant === "feature" && content.tags.length > 0 ? (
          <ul className={styles.tags} aria-label="Tags">
            {content.tags.slice(0, 5).map(tag => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.foot}>
          <span className={styles.stats}>
            <span title="Upvotes">
              <Icon glyph={arrowUp01} />
              {formatCount(project.upvotes)}
            </span>
            {content.kind === "resource" ? (
              <span title="Downloads">
                <Icon glyph={download02} />
                {formatCount(project.downloads)}
              </span>
            ) : null}
            <time dateTime={project.updatedAtUtc} title="Updated">
              {formatDate(project.updatedAtUtc)}
            </time>
          </span>
        </div>
        {actions ? (
          <div className={styles.footActions}>
            <span className={styles.actions}>{actions}</span>
          </div>
        ) : null}
        {variant === "feature" ? (
          <div className={styles.cta}>
            <Button color="blue" lines="right" href={href}>
              {content.kind === "resource" ? "View and download" : "View showcase"}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** Cards in a list, spaced for their slanted frames. Each child becomes one item. */
export function WorkshopGrid({ children, columns, label }: { children: ReactNode; columns?: 2 | 3; label?: string }) {
  // A short shelf spreads its cards over the width rather than leaving a hole.
  const count = Children.toArray(children).length;
  return (
    <ul className={cx(styles.grid, (columns ?? (count <= 2 ? 2 : 3)) === 2 && styles.two)} aria-label={label} data-workshop-grid>
      {Children.map(children, child => (child ? <li>{child}</li> : null))}
    </ul>
  );
}
