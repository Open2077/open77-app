import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/data";
import { EmptyState, Notice, Stat } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01 } from "@/components/ui/icons";
import { Section } from "@/components/ui/page";
import { Display, Eyebrow } from "@/components/ui/typography";
import { safeHttpUrl } from "@/components/admin/format";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { ProjectCard } from "@/components/community/project-card";
import { WorkshopGrid } from "@/components/community/workshop-card";
import { WorkshopHero } from "@/components/community/workshop-hero";
import { UserLink } from "@/components/community/workshop-link";
import { CommunityReadError, getCreator, getMedia } from "@/lib/community/public-api";
import { formatCount, formatDate } from "@/lib/community/format";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";

import styles from "./creator.module.css";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getCreator(handle).catch(() => null);
  return result ? withCommunityImage(pageMetadata({ title: `@${result.profile.handle}`, description: result.profile.bio.slice(0, 180) || "Community creations on the OPEN//77 Workshop.", path: `/workshop/creators/${result.profile.handle}` }), result.profile.avatarMediaId, `@${result.profile.handle}`) :
    { title: "Creator unavailable", robots: { index: false, follow: false } };
}

export default async function CreatorPage({ params, searchParams }: {
  params: Promise<{ handle: string }>; searchParams: Promise<{ cursor?: string }>;
}) {
  const { handle } = await params;
  const { cursor } = await searchParams;
  const result = await getCreator(handle, cursor).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (result instanceof CommunityReadError && result.status === 400) return <HubShell><div className={styles.notice}><Notice kind="warning" title="This page link has expired or is invalid"><Link href={`/workshop/creators/${encodeURIComponent(handle)}`}>Start from the creator’s latest page.</Link></Notice></div></HubShell>;
  if (!result || typeof result !== "object" || !("profile" in result)) return <HubShell><div className={styles.notice}><HubReadFailure error={result} /></div></HubShell>;
  const { profile, projects } = result as Awaited<ReturnType<typeof getCreator>>;
  if (profile.handle !== handle) permanentRedirect(`/workshop/creators/${profile.handle}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const avatar = profile.avatarMediaId ? (await getMedia(profile.avatarMediaId).catch(() => null))?.derivatives.find(item => item.name === "card") : null;
  const links = profile.links.map(link => ({ ...link, url: safeHttpUrl(link.url) })).filter(link => link.url);
  // Totals only describe what this page lists; "+" says there is more.
  const more = projects.nextCursor ? "+" : "";
  const totals = cursor ? null : {
    creations: `${projects.items.length}${more}`,
    downloads: `${formatCount(projects.items.reduce((sum, item) => sum + item.downloads, 0))}${more}`,
    upvotes: `${formatCount(projects.items.reduce((sum, item) => sum + item.upvotes, 0))}${more}`,
  };
  return <HubShell>
    <WorkshopHero
      art={{ src: "/home/img/players-bg.webp", position: "50% 30%" }}
      watermark="Creator"
      crumbs={[{ label: "Workshop", href: "/workshop" }, { label: "Browse", href: "/workshop/browse" }, { label: `@${profile.handle}` }]}
      eyebrow={<Eyebrow>Community creator · since {formatDate(profile.createdAtUtc)}</Eyebrow>}
      title={
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {avatar ? (
              <span className={styles.avatarFrame}>
                <Image unoptimized src={avatar.url} width={avatar.width} height={avatar.height} alt="" referrerPolicy="no-referrer" />
              </span>
            ) : (
              <Avatar name={profile.handle} size={112} />
            )}
          </span>
          <Display as="h1" size={profile.handle.length > 14 ? "md" : "lg"} className={styles.handle} lines={[`@${profile.handle}`]} glitch />
        </div>
      }
      lead={profile.bio || undefined}
      aside={totals ? (
        <div className={styles.stats} role="group" aria-label="Creator statistics">
          <Stat value={totals.creations} label="Creations" />
          <Stat value={totals.downloads} label="Downloads" />
          <Stat value={totals.upvotes} label="Upvotes" />
        </div>
      ) : undefined}
    >
      {links.length > 0 ? (
        <ul className={styles.links} aria-label="Creator links">
          {links.map(link => <li key={link.url}><UserLink href={link.url!}>{link.label}</UserLink></li>)}
        </ul>
      ) : null}
    </WorkshopHero>
    <Section eyebrow={<Eyebrow as="span" index={1}>Published</Eyebrow>} title={["Creations"]}>
      {projects.items.length ? (
        <WorkshopGrid label="Published creations">
          {projects.items.map((project, index) => <ProjectCard key={project.projectId} project={project} eager={index < 3} />)}
        </WorkshopGrid>
      ) : (
        <EmptyState eyebrow="Nothing here yet" title="No published creations on this page yet">
          This creator’s work appears here once it has been reviewed and published.
        </EmptyState>
      )}
      {cursor || projects.nextCursor ? (
        <nav className={styles.pagination} aria-label="Creator project pages">
          {cursor ? <Button color="blue" border lines="none" size="sm" icon={arrowLeft01} iconPosition="left" href={`/workshop/creators/${profile.handle}`}>First page</Button> : null}
          {projects.nextCursor ? <Button color="blue" border lines="none" size="sm" icon={arrowRight01} href={`/workshop/creators/${profile.handle}?cursor=${encodeURIComponent(projects.nextCursor)}`}>More creations</Button> : null}
        </nav>
      ) : null}
    </Section>
  </HubShell>;
}
