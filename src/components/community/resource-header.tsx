import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowRight01, serverStack01 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatBytes, formatCount, formatDate } from "@/lib/community/format";
import { getMedia } from "@/lib/community/public-api";
import { categoryLabel, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";
import { WorkshopHero, spaced } from "./workshop-hero";

import styles from "./resource-header.module.css";

export type ResourceTab = "overview" | "versions" | "discussion";

/** Breaks a creation name into display lines, word groups of at most `max` characters. */
function titleLines(title: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length ? lines : [title];
}

/**
 * The top of every Workshop item page: breadcrumb, the creation's own cover as
 * an ambient wash, the title block with the creator, tags and counters, and the
 * one action on the right. Sub-pages (all versions, discussion) shrink it and
 * add their crumb; the section tabs close it.
 */
export async function ResourceHeader({ project, latest, tab }: { project: CommunityProject; latest: CommunityRelease | null; tab: ResourceTab }) {
  const { content } = project;
  const base = `/workshop/${project.slug}`;
  const reference = content.media?.[0];
  const media = reference ? await getMedia(reference.mediaId).catch(() => null) : content.clipMediaId ? await getMedia(content.clipMediaId).catch(() => null) : null;
  const backdrop = media?.derivatives.find(item => item.name === (reference ? "card" : "poster"))?.url ?? null;
  const picture = (reference ? media?.derivatives.find(item => item.name === "gallery")?.url : null) ?? backdrop;
  const resource = content.kind === "resource";
  const short = content.title.length <= 18;
  const crumbs = [
    { label: "Workshop", href: "/workshop" },
    { label: categoryLabel(content.category), href: `/workshop/browse?category=${content.category}` },
    ...(tab === "overview" ? [{ label: content.title }] : [{ label: content.title, href: base }, { label: tab === "versions" ? "All versions" : "Discussion" }]),
  ];
  return (
    <>
      <WorkshopHero
        size="compact"
        flush
        className={styles.hero}
        art={backdrop ? { src: backdrop, remote: true } : { src: "/home/img/creators-bg.webp", position: "50% 30%" }}
        cover={picture && tab === "overview" ? { src: picture } : undefined}
        crumbs={crumbs}
        eyebrow={
          <div className={styles.kicker}>
            <Eyebrow>{resource ? "Resource" : "Showcase"}</Eyebrow>
            <Tag variant={content.maturity === "stable" ? "solid" : "outline"}>{content.maturity}</Tag>
            {project.state === "archived" ? <Tag tone="neutral">archived</Tag> : null}
          </div>
        }
        title={
          <Display
            as="h1"
            className={styles.title}
            size={tab === "overview" ? (short ? "lg" : "md") : "md"}
            lines={spaced(titleLines(content.title, short ? 12 : 18))}
            glitch
          />
        }
        lead={tab === "overview" ? content.summary : undefined}
        aside={
          <Panel brackets padding="md" className={styles.panel} data-resource-action>
            <Eyebrow>{resource ? "Latest release" : "Showcase"}</Eyebrow>
            {resource ? (
              latest ? (
                <p className={styles.release}>
                  <span className={styles.version}>v{latest.version}</span>
                  <span className={styles.size}>{formatBytes(latest.sizeBytes)}</span>
                </p>
              ) : (
                <p className={styles.note}>No stable release is available yet.</p>
              )
            ) : (
              <p className={styles.note}>A creation built with OPEN//77, shown by its author. There is no package to install.</p>
            )}
            {resource && latest && latest.state === "published" ? (
              <DownloadButton releaseId={latest.releaseId} version={latest.version} primary fullWidth />
            ) : resource ? (
              <Button color="blue" border lines="none" fullWidth icon={arrowRight01} href={`${base}/versions`}>
                Browse versions
              </Button>
            ) : null}
            <div className={styles.jumps}>
              {resource && tab === "overview" ? (
                <a className={styles.jump} href="#warden">
                  <Icon glyph={serverStack01} />
                  Install with Warden
                </a>
              ) : null}
              {tab === "overview" ? (
                <a className={styles.jump} href="#discussion">
                  <Icon glyph={arrowDown01} />
                  Jump to discussion
                </a>
              ) : (
                <Link className={styles.jump} href={base}>
                  <Icon glyph={arrowRight01} />
                  Back to the overview
                </Link>
              )}
            </div>
          </Panel>
        }
      >
        <div className={styles.byline}>
          <span className={styles.creator}>
            <Avatar name={project.creatorHandle ?? "Community"} size={34} />
            {project.creatorHandle ? (
              <span>
                by <Link href={`/workshop/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link>
              </span>
            ) : (
              "by a community creator"
            )}
          </span>
          <span className={styles.sep} aria-hidden="true">
            {"//"}
          </span>
          <span>updated {formatDate(project.updatedAtUtc)}</span>
          {tab === "overview" ? (
            <>
              <span className={`${styles.sep} ${styles.statsSep}`} aria-hidden="true">
                {"//"}
              </span>
              {/* Counters ride the byline: big numerals here pushed the page itself out of the first screen. */}
              <span className={styles.stats} aria-label="Statistics" role="group">
                {resource ? (
                  <span className={styles.stat}>
                    <b>{formatCount(project.downloads)}</b> downloads
                  </span>
                ) : null}
                <span className={styles.stat}>
                  <b>{formatCount(project.upvotes)}</b> upvotes
                </span>
                <span className={styles.stat}>
                  <b>{formatCount(project.views)}</b> views
                </span>
              </span>
            </>
          ) : null}
        </div>
        {content.tags.length > 0 ? (
          <ul className={styles.tags} aria-label="Tags">
            {content.tags.map(tag => (
              <li key={tag}>
                <Link className={styles.tag} href={`/workshop/browse?tag=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </WorkshopHero>
      <div className={styles.tabs} data-resource-tabs>
        <Tabs
          label="Creation sections"
          exact
          items={[
            { label: "Overview", href: base },
            ...(resource ? [{ label: "Versions", href: `${base}/versions` }] : []),
            { label: "Discussion", href: `${base}/discussion` },
          ]}
        />
      </div>
    </>
  );
}
