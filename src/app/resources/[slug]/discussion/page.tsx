import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { Discussion } from "@/components/community/discussion";
import { CommunityReadError, getComment, getComments, getProject } from "@/lib/community/public-api";
import type { CommunityComment, CommunityPage } from "@/lib/community/types";
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
  let page: CommunityPage<CommunityComment>;
  try {
    if (thread) {
      if (!/^[0-9a-f-]{36}$/i.test(thread)) notFound();
      const root = await getComment(thread);
      if (root.projectId !== resource.projectId) notFound();
      if (root.parentId) permanentRedirect(`/resources/${resource.slug}/discussion?thread=${root.parentId}`);
      page = { items: [root], nextCursor: null };
    } else page = await getComments(resource.projectId, cursor);
  } catch (error) {
    if (error instanceof CommunityReadError) {
      if (error.status === 404) notFound();
      if (error.status === 400) return <HubShell><p className="hub-notice">This discussion page link is invalid. <Link href={`/resources/${resource.slug}/discussion`}>Open the latest discussion.</Link></p></HubShell>;
      return <HubShell><HubReadFailure error={error} /></HubShell>;
    }
    throw error;
  }
  return <HubShell><header className="hub-directory-head"><Link href={`/resources/${resource.slug}`}>← {resource.content.title}</Link><p className="hub-kicker">COMMUNITY DISCUSSION</p><h1>Build it together.</h1><p>Ask questions, share your experience and help improve this creation.</p>
    {resource.content.issueUrl && <a href={resource.content.issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc">External issue tracker ↗</a>}</header>
    <Discussion project={resource} page={page} focusThread={!!thread} />
    <nav className="hub-actions" aria-label="Discussion pages">{(cursor || thread) && <Link className="btn btn-ghost" href={`/resources/${resource.slug}/discussion`}>All recent threads</Link>}
      {page.nextCursor && <Link className="btn btn-ghost" href={`/resources/${resource.slug}/discussion?cursor=${encodeURIComponent(page.nextCursor)}`}>Older threads →</Link>}</nav></HubShell>;
}
