import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CodeIcon, GlobeIcon } from "@/components/icons";
import { safeHttpUrl } from "@/components/admin/format";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { CommunityReadError, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { ReleaseList } from "@/components/community/release-list";
import { LatestRelease } from "@/components/community/latest-release";
import { MediaGallery } from "@/components/community/media-gallery";
import { ExternalVideos } from "@/components/community/external-videos";
import { ReportForm } from "@/components/community/report-form";
import { ProjectActions } from "@/components/community/project-actions";
import { ProjectView } from "@/components/community/project-view";
import { ResourceHeader } from "@/components/community/resource-header";
import { ShareProject } from "@/components/community/share-project";
import { withCommunityImage } from "@/lib/community/metadata";
import { communityStructuredData } from "@/lib/community/structured-data";
import { formatDate, pickLatestStable } from "@/lib/community/format";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { categoryLabel, type CommunityRelease } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return project ? withCommunityImage(pageMetadata({ title: project.content.title, description: project.content.summary, path: `/resources/${project.slug}` }), project.content.media?.[0]?.mediaId, project.content.media?.[0]?.altText ?? project.content.title) :
    { title: "Resource unavailable", robots: { index: false, follow: false } };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProject(slug).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (!result || typeof result !== "object" || !("projectId" in result)) return <HubShell><HubReadFailure error={result} /></HubShell>;
  const project = result as Awaited<ReturnType<typeof getProject>>;
  if (project.slug !== slug) permanentRedirect(`/resources/${project.slug}`);
  const { content } = project;
  const base = `/resources/${project.slug}`;
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
  const [description, installation, license] = await Promise.all([
    communityMarkdown(content.description), communityMarkdown(content.installation), communityMarkdown(content.license ?? ""),
  ]);
  const sourceUrl = safeHttpUrl(content.sourceUrl), issueUrl = safeHttpUrl(content.issueUrl);
  return <HubShell><ProjectView id={project.projectId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: communityStructuredData(project, SITE_URL) }} />
    <p className="hub-back"><Link href="/resources">← Library</Link></p>
    <ResourceHeader project={project} latest={latest} tab="overview" />
    {project.state === "archived" && <p className="hub-notice">This creation is archived. Its approved releases remain available, but it is closed to new comments and updates.</p>}
    <div className="hub-detail"><article className="hub-detail-main">
      <MediaGallery media={content.media ?? []} />
      <section className="hub-prose" aria-label="About"><h2>About</h2><div dangerouslySetInnerHTML={{ __html: description }} /></section>
      <ExternalVideos urls={content.videoUrls ?? []} />
      {content.installation && <section className="hub-prose" aria-label="Installation"><h2>Installation</h2><div dangerouslySetInnerHTML={{ __html: installation }} /></section>}
      {content.license && <section className="hub-prose" aria-label="License"><h2>License</h2><div dangerouslySetInnerHTML={{ __html: license }} /></section>}
      {content.kind === "resource" && <section className="hub-prose" aria-label="Recent releases"><div className="hub-section-head"><h2>Recent releases</h2><Link href={`${base}/versions`}>All versions →</Link></div>
        {releases ? <ReleaseList releases={releases.items.slice(0, 3)} /> : <HubReadFailure error={releaseResult} />}</section>}
    </article>
    <aside className="hub-detail-side">
      {content.kind === "resource" && (releasesFailed ? <HubReadFailure error={latestResult} /> : <LatestRelease release={latest} versionsHref={`${base}/versions`} />)}
      {content.kind === "showcase" && <section className="hub-panel"><p className="hub-kicker">SHOWCASE</p><h2>Nothing to install</h2><p>This creation is shown for inspiration. Its author has not attached a downloadable package.</p></section>}
      <section className="hub-panel" aria-label="Community actions"><ProjectActions project={project} /></section>
      <section className="hub-panel" aria-label="Details"><p className="hub-kicker">DETAILS</p>
        <dl className="hub-info">
          <div><dt>Category</dt><dd>{categoryLabel(content.category)}</dd></div>
          <div><dt>Type</dt><dd>{content.kind === "showcase" ? "Showcase" : "Downloadable resource"}</dd></div>
          <div><dt>Status</dt><dd>{content.maturity === "stable" ? "Stable" : "Experimental"}</dd></div>
          <div><dt>License</dt><dd>{content.license ? (content.license.split("\n")[0] ?? content.license).slice(0, 40) : "not stated"}</dd></div>
          <div><dt>Published</dt><dd>{formatDate(project.publishedAtUtc)}</dd></div>
          <div><dt>Updated</dt><dd>{formatDate(project.updatedAtUtc)}</dd></div>
        </dl>
        {(sourceUrl || issueUrl) && <div className="hub-links">
          {sourceUrl && <a className="hub-link-chip" href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><CodeIcon size={13} />Source code</a>}
          {issueUrl && <a className="hub-link-chip" href={issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><GlobeIcon size={13} />Issue tracker</a>}</div>}
        {content.tags.length > 0 && <div className="hub-tags">{content.tags.map(tag => <Link key={tag} href={`/resources?tags=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>}
        {content.kind === "resource" && <p className="hub-footnote">Downloads count completed file deliveries, including resumed transfers.</p>}
      </section>
      <section className="hub-panel" aria-label="Share and report"><ShareProject url={absoluteUrl(base)} title={content.title} /><ReportForm targetType="project" targetId={project.projectId} /></section>
    </aside></div></HubShell>;
}
