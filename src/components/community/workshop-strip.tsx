import Link from "next/link";
import type { CSSProperties } from "react";

import { Icon } from "@/components/ui/icon";
import { arrowRight01, arrowUp01 } from "@/components/ui/icons";
import { formatCount } from "@/lib/community/format";
import { categoryLabel, type CommunityProject } from "@/lib/community/types";
import { WorkshopIcon } from "./workshop-icon";

import styles from "./workshop-strip.module.css";

/**
 * The first resources of the library, along the foot of the Workshop hero: a
 * row of ranked links, so a short window shows real creations next to the
 * search, not only a title. The shelves below carry the full cards.
 */
export function WorkshopStrip({ id, title, href, projects }: { id: string; title: string; href: string; projects: CommunityProject[] }) {
  const items = projects.slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className={styles.strip} aria-labelledby={id} style={{ "--count": items.length } as CSSProperties}>
      <div className={styles.head}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        <Link className={styles.all} href={href}>
          View all
          <Icon glyph={arrowRight01} />
        </Link>
      </div>
      <ol className={styles.items}>
        {items.map((project, index) => (
          <li key={project.projectId}>
            <Link className={styles.item} href={`/workshop/${project.slug}`}>
              <span className={styles.rank} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.body}>
                <span className={styles.category}>
                  <WorkshopIcon category={project.content.category} size={14} />
                  {categoryLabel(project.content.category)}
                  {project.content.kind === "showcase" ? " · Showcase" : null}
                </span>
                <span className={styles.name}>{project.content.title}</span>
                <span className={styles.meta}>
                  {project.creatorHandle ? `by @${project.creatorHandle}` : "Community creator"}
                  <span className={styles.votes} title="Upvotes">
                    <Icon glyph={arrowUp01} />
                    {formatCount(project.upvotes)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
