import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
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
import { ShareProject } from "@/components/community/share-project";
import { withCommunityImage } from "@/lib/community/metadata";
import { communityStructuredData } from "@/lib/community/structured-data";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { categoryLabel } from "@/lib/community/types";
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
  const [releaseResult, latestResult] = content.kind === "resource" ? await Promise.all([
    listReleases(project.projectId).catch((error: unknown) => error), latestRelease(project.projectId).catch((error: unknown) => error),
  ]) : [null, null];
  const releases = releaseResult && typeof releaseResult === "object" && "items" in releaseResult ? releaseResult as Awaited<ReturnType<typeof listReleases>> : null;
  const [description, installation, license] = await Promise.all([
    communityMarkdown(content.description), communityMarkdown(content.installation), communityMarkdown(content.license ?? ""),
  ]);
  return <HubShell><ProjectView id={project.projectId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: communityStructuredData(project, SITE_URL) }} /><header className="hub-directory-head"><Link href="/resources">← Community resources</Link>
    <p className="hub-kicker">{categoryLabel(content.category)} / {content.kind === "showcase" ? "SHOWCASE" : "RESOURCE"}</p>
    <h1>{content.title}</h1><p>{content.summary}</p>{project.creatorHandle && <p className="hub-creator-byline">By <Link href={`/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link></p>}<div className="hub-tags">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div></header>
    {project.state === "archived" && <p className="hub-notice">This creation is archived. Its approved releases remain available, but it is closed to new comments and updates.</p>}
    <div className="hub-detail"><article className="hub-prose"><MediaGallery media={content.media ?? []} /><h2>About this creation</h2><div dangerouslySetInnerHTML={{ __html: description }} />
      <ExternalVideos urls={content.videoUrls ?? []} />
      {content.installation && <><h2>Installation</h2><div dangerouslySetInnerHTML={{ __html: installation }} /></>}
      {content.license && <><h2>License</h2><div dangerouslySetInnerHTML={{ __html: license }} /></>}
      {content.kind === "resource" && <section aria-label="Releases"><h2>Releases</h2>
        {releases ? <ReleaseList releases={releases.items.slice(0, 4)} /> : <HubReadFailure error={releaseResult} />}
        <Link className="btn btn-ghost" href={`/resources/${project.slug}/versions`}>All versions →</Link></section>}
    </article><aside className="hub-detail-panel"><p className="hub-kicker">{content.maturity.toUpperCase()}</p>
      <h2>{content.kind === "showcase" ? "A look at what’s possible." : "Release information"}</h2>
      <p>{content.kind === "showcase" ? "This creation is a showcase. Its author hasn’t attached a downloadable release." : "Check the author’s installation instructions and compatibility before adding this resource to your server."}</p>
      {content.kind === "resource" && (latestResult === null || (typeof latestResult === "object" && "releaseId" in latestResult)
        ? <LatestRelease release={latestResult as Awaited<ReturnType<typeof latestRelease>>} /> : <HubReadFailure error={latestResult} />)}
      {content.kind === "resource" && <Link className="btn btn-primary" href={`/resources/${project.slug}/versions`}>Browse versions</Link>}
      {content.sourceUrl && <a className="btn btn-ghost" href={content.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc">View source ↗</a>}
      {content.issueUrl && <p><a href={content.issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc">Issue tracker ↗</a></p>}
      <ReportForm targetType="project" targetId={project.projectId} />
      <ProjectActions project={project} />
      <p>{project.views} views{content.kind === "resource" ? ` · ${project.downloads} downloads` : ""}</p>
      {content.kind === "resource" && <small>Downloads count completed file deliveries, including completed resumed transfers.</small>}
      <p><Link href={`/resources/${project.slug}/discussion`}>Join the discussion →</Link></p>
      <ShareProject url={absoluteUrl(`/resources/${project.slug}`)} title={content.title} />
    </aside></div></HubShell>;
}
