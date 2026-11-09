import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { DefinitionList } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { Panel } from "@/components/ui/panel";
import { Prose } from "@/components/ui/prose";
import { Eyebrow } from "@/components/ui/typography";
import { safeHttpUrl } from "@/components/admin/format";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { CommunityReadError, getComments, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { Discussion } from "@/components/community/discussion";
import { ReleaseList } from "@/components/community/release-list";
import { MediaGallery } from "@/components/community/media-gallery";
import { ExternalVideos } from "@/components/community/external-videos";
import { ReportForm } from "@/components/community/report-form";
import { ProjectActions } from "@/components/community/project-actions";
import { ProjectView } from "@/components/community/project-view";
import { ResourceHeader } from "@/components/community/resource-header";
import { ShareProject } from "@/components/community/share-project";
import { DownloadButton } from "@/components/community/download-button";
import { UserLink } from "@/components/community/workshop-link";
import { WardenLink } from "@/components/community/warden-link";
import { withCommunityImage } from "@/lib/community/metadata";
import { communityStructuredData } from "@/lib/community/structured-data";
import { formatBytes, formatCount, formatDate, pickLatestStable } from "@/lib/community/format";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { categoryLabel, type CommunityRelease } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { pageMetadata } from "@/lib/seo";
import { Block } from "./parts";

import styles from "./resource.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return project ? withCommunityImage(pageMetadata({ title: project.content.title, description: project.content.summary, path: `/workshop/${project.slug}` }), project.content.media?.[0]?.mediaId ?? project.content.clipMediaId, project.content.media?.[0]?.altText ?? project.content.title) :
    { title: "Resource unavailable", robots: { index: false, follow: false } };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProject(slug).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (!result || typeof result !== "object" || !("projectId" in result)) return <HubShell><div className={styles.notice}><HubReadFailure error={result} /></div></HubShell>;
  const project = result as Awaited<ReturnType<typeof getProject>>;
  if (project.slug !== slug) permanentRedirect(`/workshop/${project.slug}`);
  const { content } = project;
  const base = `/workshop/${project.slug}`;
  const [releaseResult, latestResult] = content.kind === "resource" ? await Promise.all([
    listReleases(project.projectId).catch((error: unknown) => error), latestRelease(project.projectId).catch((error: unknown) => error),
  ]) : [null, null];
  const releases = releaseResult && typeof releaseResult === "object" && "items" in releaseResult ? releaseResult as Awaited<ReturnType<typeof listReleases>> : null;
  // The dedicated endpoint wins; a master without it (or a transient failure)
  // falls back to the newest stable release from the list rather than
  // reporting a missing release next to a visible one.
  const latest: CommunityRelease | null = latestResult && typeof latestResult === "object" && "releaseId" in latestResult ? latestResult as CommunityRelease :
    releases ? pickLatestStable(releases.items) : null;
  const releasesFailed = content.kind === "resource" && !releases && latest === null;
  const [description, installation, license, releaseNotes, threads] = await Promise.all([
    communityMarkdown(content.description), communityMarkdown(content.installation), communityMarkdown(content.license ?? ""),
    communityMarkdown(latest?.metadata.installation ?? ""), getComments(project.projectId).catch((error: unknown) => error),
  ]);
  const discussion = threads && typeof threads === "object" && "items" in threads ? threads as Awaited<ReturnType<typeof getComments>> : null;
  const sourceUrl = safeHttpUrl(content.sourceUrl), issueUrl = safeHttpUrl(content.issueUrl);
  const preload = latest?.resources.some(resource => resource.manifest.preloadMods.length > 0) ?? false;
  const permissions = [...new Set(latest?.resources.flatMap(resource => resource.manifest.permissions) ?? [])];
  const resource = content.kind === "resource";
  let block = 1;
  const facts = [
    ...(resource ? [{ label: "Version", value: latest ? `v${latest.version}` : "No stable release" }] : []),
    ...(resource && latest ? [{ label: "Size", value: formatBytes(latest.sizeBytes) }] : []),
    ...(resource && latest ? [{ label: "Tested on", value: latest.metadata.testedBuilds.length ? [...new Set(latest.metadata.testedBuilds)].join(", ") : "Not declared" }] : []),
    ...(resource && latest ? [{ label: "Requires", value: latest.metadata.requiredResources.length ? latest.metadata.requiredResources.join(", ") : "Nothing else" }] : []),
    ...(resource && latest && latest.resources.length > 0 ? [{ label: "Includes", value: latest.resources.map(item => item.name).join(", ") }] : []),
    ...(permissions.length > 0 ? [{ label: "Permissions", value: permissions.join(", ") }] : []),
    ...(resource ? [{ label: "Downloads", value: formatCount(project.downloads) }] : []),
    { label: "Upvotes", value: formatCount(project.upvotes) },
    { label: "Views", value: formatCount(project.views) },
    { label: "Category", value: categoryLabel(content.category) },
    { label: "Status", value: content.maturity === "stable" ? "Stable" : "Experimental" },
    { label: "License", value: content.license ? (content.license.split("\n")[0] ?? content.license).slice(0, 40) : "Not stated" },
    { label: "Published", value: formatDate(project.publishedAtUtc) },
    { label: "Updated", value: formatDate(project.updatedAtUtc) },
  ];
  return <HubShell><ProjectView id={project.projectId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: communityStructuredData(project, SITE_URL) }} />
    <ResourceHeader project={project} latest={latest} tab="overview" />
    {project.state === "archived" ? (
      <div className={styles.notice}>
        <Notice kind="warning" title="This creation is archived">
          Its approved releases remain available, but it is closed to new comments and updates.
        </Notice>
      </div>
    ) : null}
    <div className={styles.layout}>
      <article className={styles.main}>
        <MediaGallery media={content.media ?? []} clipMediaId={content.clipMediaId} />
        <Block index={block++} label="Overview" title="About" id="about">
          <Prose className={styles.readme} html={description} />
        </Block>
        <ExternalVideos urls={content.videoUrls ?? []} />
        {content.installation ? (
          <Block index={block++} label="Setup" title="Installation" id="installation">
            <Prose className={styles.readme} html={installation} />
          </Block>
        ) : null}
        {content.license ? (
          <Block index={block++} label="Terms" title="License" id="license">
            <Prose className={styles.readme} size="sm" html={license} />
          </Block>
        ) : null}
        {resource ? (
          <Block index={block++} label="Releases" title="Recent releases" id="releases" aside={<Link className={styles.more} href={`${base}/versions`}>All versions →</Link>}>
            {releases ? <ReleaseList releases={releases.items.slice(0, 3)} /> : <HubReadFailure error={releaseResult} />}
          </Block>
        ) : null}
      </article>
      <aside className={styles.side} aria-label="Creation details">
        {resource && releasesFailed ? <HubReadFailure error={latestResult} /> : null}
        <Panel as="section" brackets aria-label="About this file" data-resource-facts>
          <Eyebrow className={styles.panelTitle}>{resource ? "About this file" : "About this showcase"}</Eyebrow>
          <DefinitionList className={styles.facts} items={facts} />
          <div className={styles.panelStack}>
            {preload ? <Notice kind="warning">Includes preload assets: server and game restarts may be required. Follow the author’s instructions.</Notice> : null}
            {resource && latest && latest.state === "published" ? <DownloadButton releaseId={latest.releaseId} version={latest.version} fullWidth /> : null}
            {resource && latest?.metadata.installation ? (
              <details className={styles.details}>
                <summary>Release notes for v{latest.version}</summary>
                <Prose className={styles.readme} size="sm" html={releaseNotes} />
                {latest.sha256 ? <p className={styles.digest}>SHA-256 <code>{latest.sha256}</code></p> : null}
              </details>
            ) : null}
            {resource ? <Link className={styles.more} href={`${base}/versions`}>All versions and changelogs →</Link> : null}
            {sourceUrl || issueUrl ? (
              <div className={styles.links}>
                {sourceUrl ? <UserLink href={sourceUrl} kind="source">Source code</UserLink> : null}
                {issueUrl ? <UserLink href={issueUrl} kind="issues">Issue tracker</UserLink> : null}
              </div>
            ) : null}
            {resource ? <p className={styles.footnote}>Downloads count completed file deliveries, including resumed transfers.</p> : null}
          </div>
        </Panel>
        <Panel as="section" aria-label="Community actions">
          <ProjectActions project={project} />
        </Panel>
        {resource ? <WardenLink url={absoluteUrl(base)} /> : null}
        <Panel as="section" aria-label="Share and report">
          <ShareProject url={absoluteUrl(base)} title={content.title} />
          <ReportForm targetType="project" targetId={project.projectId} />
        </Panel>
      </aside>
      <div className={styles.talk}>
        <Block index={block++} label="Community" title="Discussion" id="discussion" aside={issueUrl ? <UserLink href={issueUrl} kind="issues">Report bugs on the author’s tracker</UserLink> : null}>
          {discussion ? (
            <>
              <Discussion project={project} page={discussion} />
              {discussion.nextCursor ? <Link className={styles.more} href={`${base}/discussion?cursor=${encodeURIComponent(discussion.nextCursor)}`}>Older threads →</Link> : null}
            </>
          ) : <HubReadFailure error={threads} />}
        </Block>
      </div>
    </div>
  </HubShell>;
}
