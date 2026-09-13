import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CodeIcon, GlobeIcon } from "@/components/icons";
import { safeHttpUrl } from "@/components/admin/format";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { CommunityReadError, getComments, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { Discussion } from "@/components/community/discussion";
import { GlobeIcon as IssueIcon } from "@/components/icons";
import { ReleaseList } from "@/components/community/release-list";
import { MediaGallery } from "@/components/community/media-gallery";
import { ExternalVideos } from "@/components/community/external-videos";
import { ReportForm } from "@/components/community/report-form";
import { ProjectActions } from "@/components/community/project-actions";
import { ProjectView } from "@/components/community/project-view";
import { ResourceHeader } from "@/components/community/resource-header";
import { ShareProject } from "@/components/community/share-project";
import { DownloadButton } from "@/components/community/download-button";
import { WardenLink } from "@/components/community/warden-link";
import { withCommunityImage } from "@/lib/community/metadata";
import { communityStructuredData } from "@/lib/community/structured-data";
import { formatBytes, formatCount, formatDate, pickLatestStable } from "@/lib/community/format";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { categoryLabel, type CommunityRelease } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { pageMetadata } from "@/lib/seo";

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
  if (!result || typeof result !== "object" || !("projectId" in result)) return <HubShell><HubReadFailure error={result} /></HubShell>;
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
  return <HubShell><ProjectView id={project.projectId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: communityStructuredData(project, SITE_URL) }} />
    <ResourceHeader project={project} latest={latest} tab="overview" />
    {project.state === "archived" && <p className="hub-notice">This creation is archived. Its approved releases remain available, but it is closed to new comments and updates.</p>}
    <div className="hub-detail"><article className="hub-detail-main">
      <MediaGallery media={content.media ?? []} clipMediaId={content.clipMediaId} />
      <section className="hub-prose" aria-label="About"><h2>About</h2><div dangerouslySetInnerHTML={{ __html: description }} /></section>
      <ExternalVideos urls={content.videoUrls ?? []} />
      {content.installation && <section className="hub-prose" aria-label="Installation"><h2>Installation</h2><div dangerouslySetInnerHTML={{ __html: installation }} /></section>}
      {content.license && <section className="hub-prose" aria-label="License"><h2>License</h2><div dangerouslySetInnerHTML={{ __html: license }} /></section>}
      {content.kind === "resource" && <section className="hub-prose" aria-label="Recent releases"><div className="hub-section-head"><h2>Recent releases</h2><Link href={`${base}/versions`}>All versions →</Link></div>
        {releases ? <ReleaseList releases={releases.items.slice(0, 3)} /> : <HubReadFailure error={releaseResult} />}</section>}
      <section className="hub-prose ws-discussion" id="discussion" aria-label="Discussion"><div className="hub-section-head"><h2>Discussion</h2>
        {issueUrl && <a className="hub-link-chip" href={issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><IssueIcon size={13} />Report bugs on the author’s tracker</a>}</div>
        {discussion ? <><Discussion project={project} page={discussion} />
          {discussion.nextCursor && <p className="hub-panel-foot"><Link href={`${base}/discussion?cursor=${encodeURIComponent(discussion.nextCursor)}`}>Older threads →</Link></p>}</> : <HubReadFailure error={threads} />}
      </section>
    </article>
    <aside className="hub-detail-side">
      {content.kind === "resource" && releasesFailed && <HubReadFailure error={latestResult} />}
      <section className="hub-panel ws-facts" aria-label="About this file"><p className="hub-kicker">{content.kind === "resource" ? "ABOUT THIS FILE" : "ABOUT THIS SHOWCASE"}</p>
        <dl className="hub-info">
          {content.kind === "resource" && <div><dt>Version</dt><dd>{latest ? `v${latest.version}` : "No stable release"}</dd></div>}
          {content.kind === "resource" && latest && <div><dt>Size</dt><dd>{formatBytes(latest.sizeBytes)}</dd></div>}
          {content.kind === "resource" && latest && <div><dt>Tested on</dt><dd>{latest.metadata.testedBuilds.length ? [...new Set(latest.metadata.testedBuilds)].join(", ") : "Not declared"}</dd></div>}
          {content.kind === "resource" && latest && <div><dt>Requires</dt><dd>{latest.metadata.requiredResources.length ? latest.metadata.requiredResources.join(", ") : "Nothing else"}</dd></div>}
          {content.kind === "resource" && latest && latest.resources.length > 0 && <div><dt>Includes</dt><dd>{latest.resources.map(resource => resource.name).join(", ")}</dd></div>}
          {permissions.length > 0 && <div><dt>Permissions</dt><dd>{permissions.join(", ")}</dd></div>}
          {content.kind === "resource" && <div><dt>Downloads</dt><dd>{formatCount(project.downloads)}</dd></div>}
          <div><dt>Upvotes</dt><dd>{formatCount(project.upvotes)}</dd></div>
          <div><dt>Views</dt><dd>{formatCount(project.views)}</dd></div>
          <div><dt>Category</dt><dd>{categoryLabel(content.category)}</dd></div>
          <div><dt>Status</dt><dd>{content.maturity === "stable" ? "Stable" : "Experimental"}</dd></div>
          <div><dt>License</dt><dd>{content.license ? (content.license.split("\n")[0] ?? content.license).slice(0, 40) : "Not stated"}</dd></div>
          <div><dt>Published</dt><dd>{formatDate(project.publishedAtUtc)}</dd></div>
          <div><dt>Updated</dt><dd>{formatDate(project.updatedAtUtc)}</dd></div>
        </dl>
        {preload && <p className="hub-notice hub-notice-warn">Includes preload assets: server and game restarts may be required. Follow the author’s instructions.</p>}
        {content.kind === "resource" && latest && latest.state === "published" && <DownloadButton releaseId={latest.releaseId} version={latest.version} />}
        {content.kind === "resource" && latest?.metadata.installation && <details className="hub-panel-details"><summary>Release notes for v{latest.version}</summary><div className="hub-prose hub-prose-small" dangerouslySetInnerHTML={{ __html: releaseNotes }} />
          {latest.sha256 && <p className="hub-release-digest">SHA-256 <code>{latest.sha256}</code></p>}</details>}
        {content.kind === "resource" && <p className="hub-panel-foot"><Link href={`${base}/versions`}>All versions and changelogs →</Link></p>}
        {(sourceUrl || issueUrl) && <div className="hub-links">
          {sourceUrl && <a className="hub-link-chip" href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><CodeIcon size={13} />Source code</a>}
          {issueUrl && <a className="hub-link-chip" href={issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><GlobeIcon size={13} />Issue tracker</a>}</div>}
        {content.kind === "resource" && <p className="hub-footnote">Downloads count completed file deliveries, including resumed transfers.</p>}
      </section>
      <section className="hub-panel" aria-label="Community actions"><ProjectActions project={project} /></section>
      {content.kind === "resource" && <WardenLink url={absoluteUrl(base)} />}
      <section className="hub-panel" aria-label="Share and report"><ShareProject url={absoluteUrl(base)} title={content.title} /><ReportForm targetType="project" targetId={project.projectId} /></section>
    </aside></div></HubShell>;
}
