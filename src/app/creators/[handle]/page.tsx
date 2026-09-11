import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { HubShell, HubUnavailable } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { CommunityReadError, getCreator, getMedia } from "@/lib/community/public-api";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getCreator(handle).catch(() => null);
  return result ? withCommunityImage(pageMetadata({ title: `@${result.profile.handle}`, description: result.profile.bio.slice(0, 180) || "Community creations on the OPEN//77 Hub.", path: `/creators/${result.profile.handle}` }), result.profile.avatarMediaId, `@${result.profile.handle}`) :
    { title: "Creator unavailable", robots: { index: false, follow: false } };
}

export default async function CreatorPage({ params, searchParams }: {
  params: Promise<{ handle: string }>; searchParams: Promise<{ cursor?: string }>;
}) {
  const { handle } = await params;
  const { cursor } = await searchParams;
  const result = await getCreator(handle, cursor).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (result instanceof CommunityReadError && result.status === 400) return <HubShell><p className="hub-notice">This page link has expired or is invalid. <Link href={`/creators/${encodeURIComponent(handle)}`}>Start from the creator’s latest page.</Link></p></HubShell>;
  if (!result || typeof result !== "object" || !("profile" in result)) return <HubShell><HubUnavailable /></HubShell>;
  const { profile, projects } = result as Awaited<ReturnType<typeof getCreator>>;
  if (profile.handle !== handle) permanentRedirect(`/creators/${profile.handle}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const avatar = profile.avatarMediaId ? (await getMedia(profile.avatarMediaId).catch(() => null))?.derivatives.find(item => item.name === "card") : null;
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">COMMUNITY CREATOR</p><h1>@{profile.handle}</h1>
    {avatar && <Image className="hub-avatar" unoptimized src={avatar.url} width={avatar.width} height={avatar.height} alt="" referrerPolicy="no-referrer" />}
    {profile.bio && <p className="hub-creator-bio">{profile.bio}</p>}
    <div className="hub-actions">{profile.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer nofollow ugc">{link.label} ↗</a>)}</div></header>
    <section aria-label="Published creations"><h2 className="hub-library-title">Creations</h2>
      {projects.items.length ? <div className="hub-grid">{projects.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div> : <p className="hub-notice">No published creations on this page yet.</p>}
      <nav className="hub-actions" aria-label="Creator project pages">{cursor && <Link className="btn btn-ghost" href={`/creators/${profile.handle}`}>First page</Link>}
        {projects.nextCursor && <Link className="btn btn-ghost" href={`/creators/${profile.handle}?cursor=${encodeURIComponent(projects.nextCursor)}`}>More creations →</Link>}</nav>
    </section></HubShell>;
}
