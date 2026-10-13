import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01 } from "@/components/ui/icons";
import { safeHttpUrl } from "@/components/admin/format";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { Discussion } from "@/components/community/discussion";
import { ResourceHeader } from "@/components/community/resource-header";
import { UserLink } from "@/components/community/workshop-link";
import { CommunityReadError, getComment, getComments, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { pickLatestStable } from "@/lib/community/format";
import type { CommunityComment, CommunityPage, CommunityRelease } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";
import { Block } from "../parts";

import styles from "../resource.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const project = await getProject(slug).catch(() => null);
  return project ? withCommunityImage(pageMetadata({ title: `${project.content.title} · discussion`, description: `Questions and discussion about ${project.content.title}.`, path: `/workshop/${project.slug}/discussion` }), project.content.media?.[0]?.mediaId, project.content.media?.[0]?.altText ?? project.content.title) : { title: "Discussion unavailable", robots: { index: false, follow: false } };
}

export default async function DiscussionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cursor?: string; thread?: string }> }) {
  const { slug } = await params; const { cursor, thread } = await searchParams;
  const project = await getProject(slug).catch((error: unknown) => error);
  if (project instanceof CommunityReadError && project.status === 404) notFound();
  if (!project || typeof project !== "object" || !("projectId" in project)) return <HubShell><div className={styles.notice}><HubReadFailure error={project} /></div></HubShell>;
  const resource = project as Awaited<ReturnType<typeof getProject>>;
  if (resource.slug !== slug) permanentRedirect(`/workshop/${resource.slug}/discussion${thread ? `?thread=${encodeURIComponent(thread)}` : cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const base = `/workshop/${resource.slug}`;
  let page: CommunityPage<CommunityComment>;
  try {
    if (thread) {
      if (!/^[0-9a-f-]{36}$/i.test(thread)) notFound();
      const root = await getComment(thread);
      if (root.projectId !== resource.projectId) notFound();
      if (root.parentId) permanentRedirect(`${base}/discussion?thread=${root.parentId}`);
      page = { items: [root], nextCursor: null };
    } else page = await getComments(resource.projectId, cursor);
  } catch (error) {
    if (error instanceof CommunityReadError) {
      if (error.status === 404) notFound();
      if (error.status === 400) return <HubShell><div className={styles.notice}><Notice kind="warning" title="This discussion page link is invalid"><Link href={`${base}/discussion`}>Open the latest discussion.</Link></Notice></div></HubShell>;
      return <HubShell><div className={styles.notice}><HubReadFailure error={error} /></div></HubShell>;
    }
    throw error;
  }
  let latest: CommunityRelease | null = null;
  if (resource.content.kind === "resource") {
    const direct = await latestRelease(resource.projectId).catch(() => null);
    latest = direct && typeof direct === "object" && "releaseId" in direct ? direct : pickLatestStable((await listReleases(resource.projectId).catch(() => null))?.items ?? []);
  }
  const issueUrl = safeHttpUrl(resource.content.issueUrl);
  return <HubShell><ResourceHeader project={resource} latest={latest} tab="discussion" />
    <div className={`${styles.layout} ${styles.single}`}>
      <article className={styles.main}>
        <Block label={thread ? "Thread" : "Community"} title="Discussion" aside={issueUrl ? <UserLink href={issueUrl} kind="issues">Report bugs on the author’s tracker</UserLink> : null}>
          <Discussion project={resource} page={page} focusThread={!!thread} />
          {cursor || thread || page.nextCursor ? (
            <nav className={styles.pagination} aria-label="Discussion pages">
              {cursor || thread ? <Button color="blue" border lines="none" size="sm" icon={arrowLeft01} iconPosition="left" href={`${base}/discussion`}>All recent threads</Button> : null}
              {page.nextCursor ? <Button color="blue" border lines="none" size="sm" icon={arrowRight01} href={`${base}/discussion?cursor=${encodeURIComponent(page.nextCursor)}`}>Older threads</Button> : null}
            </nav>
          ) : null}
        </Block>
      </article>
    </div>
  </HubShell>;
}
