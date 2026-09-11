import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { HubShell, HubUnavailable } from "@/components/community/hub-shell";
import { ReleaseList } from "@/components/community/release-list";
import { CommunityReadError, getProject, listReleases } from "@/lib/community/public-api";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return project ? pageMetadata({ title: `${project.content.title} — versions`, description: `Release history and installation details for ${project.content.title}.`, path: `/resources/${project.slug}/versions` }) :
    { title: "Versions unavailable", robots: { index: false, follow: false } };
}

export default async function VersionsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ cursor?: string }>;
}) {
  const { slug } = await params;
  const { cursor } = await searchParams;
  const project = await getProject(slug).catch((error: unknown) => error);
  if (project instanceof CommunityReadError && project.status === 404) notFound();
  if (!project || typeof project !== "object" || !("projectId" in project)) return <HubShell><HubUnavailable /></HubShell>;
  const resource = project as Awaited<ReturnType<typeof getProject>>;
  if (resource.slug !== slug) permanentRedirect(`/resources/${resource.slug}/versions`);
  const releases = await listReleases(resource.projectId, cursor).catch(() => null);
  return <HubShell><header className="hub-directory-head"><Link href={`/resources/${resource.slug}`}>← {resource.content.title}</Link>
    <p className="hub-kicker">RELEASE HISTORY</p><h1>Choose your version.</h1><p>Review compatibility, changes and installation instructions before downloading.</p></header>
    {releases ? <><ReleaseList releases={releases.items} downloadable={resource.content.kind === "resource"} />
      <nav className="hub-pagination" aria-label="Release pages">{cursor && <Link className="btn btn-ghost" href={`/resources/${resource.slug}/versions`}>Newest releases</Link>}
        {releases.nextCursor && <Link className="btn btn-ghost" href={`/resources/${resource.slug}/versions?cursor=${encodeURIComponent(releases.nextCursor)}`}>Older releases →</Link>}</nav></> : <HubUnavailable />}
  </HubShell>;
}
