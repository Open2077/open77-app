import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { safeHttpUrl } from "@/components/admin/format";
import { GlobeIcon } from "@/components/icons";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { Discussion } from "@/components/community/discussion";
import { ResourceHeader } from "@/components/community/resource-header";
import { CommunityReadError, getComment, getComments, getProject, latestRelease, listReleases } from "@/lib/community/public-api";
import { pickLatestStable } from "@/lib/community/format";
import type { CommunityComment, CommunityPage, CommunityRelease } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const project = await getProject(slug).catch(() => null);
  return project ? withCommunityImage(pageMetadata({ title: `${project.content.title} — discussion`, description: `Questions and discussion about ${project.content.title}.`, path: `/resources/${project.slug}/discussion` }), project.content.media?.[0]?.mediaId, project.content.media?.[0]?.altText ?? project.content.title) : { title: "Discussion unavailable", robots: { index: false, follow: false } };
}

export default async function DiscussionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cursor?: string; thread?: string }> }) {
  const { slug } = await params; const { cursor, thread } = await searchParams;
  const project = await getProject(slug).catch((error: unknown) => error);
  if (project instanceof CommunityReadError && project.status === 404) notFound();
  if (!project || typeof project !== "object" || !("projectId" in project)) return <HubShell><HubReadFailure error={project} /></HubShell>;
  const resource = project as Awaited<ReturnType<typeof getProject>>;
  if (resource.slug !== slug) permanentRedirect(`/resources/${resource.slug}/discussion${thread ? `?thread=${encodeURIComponent(thread)}` : cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const base = `/resources/${resource.slug}`;
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
      if (error.status === 400) return <HubShell><p className="hub-notice">This discussion page link is invalid. <Link href={`${base}/discussion`}>Open the latest discussion.</Link></p></HubShell>;
      return <HubShell><HubReadFailure error={error} /></HubShell>;
    }
    throw error;
  }
  let latest: CommunityRelease | null = null;
  if (resource.content.kind === "resource") {
    const direct = await latestRelease(resource.projectId).catch(() => null);
    latest = direct && typeof direct === "object" && "releaseId" in direct ? direct : pickLatestStable((await listReleases(resource.projectId).catch(() => null))?.items ?? []);
  }
  const issueUrl = safeHttpUrl(resource.content.issueUrl);
  return <HubShell><p className="hub-back"><Link href="/resources">← Library</Link></p>
    <ResourceHeader project={resource} latest={latest} tab="discussion" />
    <div className="hub-detail hub-detail-single"><article className="hub-detail-main">
      <div className="hub-section-head"><h2>Discussion</h2>{issueUrl && <a className="hub-link-chip" href={issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc"><GlobeIcon size={13} />Report bugs on the author’s tracker</a>}</div>
      <Discussion project={resource} page={page} focusThread={!!thread} />
      <nav className="hub-pagination hub-actions" aria-label="Discussion pages">{(cursor || thread) && <Link className="btn btn-ghost btn-small" href={`${base}/discussion`}>All recent threads</Link>}
        {page.nextCursor && <Link className="btn btn-ghost btn-small" href={`${base}/discussion?cursor=${encodeURIComponent(page.nextCursor)}`}>Older threads →</Link>}</nav>
    </article></div></HubShell>;
}
