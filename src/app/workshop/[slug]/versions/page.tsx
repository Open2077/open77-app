import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { arrowLeft01, arrowRight01 } from "@/components/ui/icons";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { ReleaseList } from "@/components/community/release-list";
import { ResourceHeader } from "@/components/community/resource-header";
import { CommunityReadError, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { pickLatestStable } from "@/lib/community/format";
import type { CommunityRelease } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";
import { Block } from "../parts";

import styles from "../resource.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return project ? withCommunityImage(pageMetadata({ title: `${project.content.title} · versions`, description: `Release history and installation details for ${project.content.title}.`, path: `/workshop/${project.slug}/versions` }), project.content.media?.[0]?.mediaId, project.content.media?.[0]?.altText ?? project.content.title) :
    { title: "Versions unavailable", robots: { index: false, follow: false } };
}

export default async function VersionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ cursor?: string }>;
}) {
  const { slug } = await params;
  const { cursor } = await searchParams;
  const project = await getProject(slug).catch((error: unknown) => error);
  if (project instanceof CommunityReadError && project.status === 404) notFound();
  if (!project || typeof project !== "object" || !("projectId" in project)) return <HubShell><div className={styles.notice}><HubReadFailure error={project} /></div></HubShell>;
  const resource = project as Awaited<ReturnType<typeof getProject>>;
  if (resource.slug !== slug) permanentRedirect(`/workshop/${resource.slug}/versions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const base = `/workshop/${resource.slug}`;
  const [result, latestResult] = await Promise.all([listReleases(resource.projectId, cursor).catch((error: unknown) => error), latestRelease(resource.projectId).catch(() => null)]);
  const releases = result && typeof result === "object" && "items" in result ? result as Awaited<ReturnType<typeof listReleases>> : null;
  const latest: CommunityRelease | null = latestResult && typeof latestResult === "object" && "releaseId" in latestResult ? latestResult : releases && !cursor ? pickLatestStable(releases.items) : null;
  return <HubShell><ResourceHeader project={resource} latest={latest} tab="versions" />
    <div className={`${styles.layout} ${styles.single}`}>
      <article className={styles.main}>
        <Block label="Releases" title="Version history" aside={<p className={styles.headNote}>Published files are immutable. Withdrawn versions stay listed but cannot be downloaded.</p>}>
          {releases ? <>
            <ReleaseList releases={releases.items} downloadable={resource.content.kind === "resource"} />
            {cursor || releases.nextCursor ? (
              <nav className={styles.pagination} aria-label="Release pages">
                {cursor ? <Button color="blue" border lines="none" size="sm" icon={arrowLeft01} iconPosition="left" href={`${base}/versions`}>Newest releases</Button> : null}
                {releases.nextCursor ? <Button color="blue" border lines="none" size="sm" icon={arrowRight01} href={`${base}/versions?cursor=${encodeURIComponent(releases.nextCursor)}`}>Older releases</Button> : null}
              </nav>
            ) : null}
          </> :
            result instanceof CommunityReadError && result.status === 400 ? (
              <Notice kind="warning" title="This version page expired or is invalid">
                <Link href={`${base}/versions`}>Return to the newest releases.</Link>
              </Notice>
            ) : <HubReadFailure error={result} />}
        </Block>
      </article>
    </div>
  </HubShell>;
}
