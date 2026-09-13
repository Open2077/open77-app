import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { safeHttpUrl } from "@/components/admin/format";
import { GlobeIcon } from "@/components/icons";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { CommunityReadError, getCreator, getMedia } from "@/lib/community/public-api";
import { formatDate } from "@/lib/community/format";
import { pageMetadata } from "@/lib/seo";
import { withCommunityImage } from "@/lib/community/metadata";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getCreator(handle).catch(() => null);
  return result ? withCommunityImage(pageMetadata({ title: `@${result.profile.handle}`, description: result.profile.bio.slice(0, 180) || "Community creations on the OPEN//77 Workshop.", path: `/workshop/creators/${result.profile.handle}` }), result.profile.avatarMediaId, `@${result.profile.handle}`) :
    { title: "Creator unavailable", robots: { index: false, follow: false } };
}

export default async function CreatorPage({ params, searchParams }: {
  params: Promise<{ handle: string }>; searchParams: Promise<{ cursor?: string }>;
}) {
  const { handle } = await params;
  const { cursor } = await searchParams;
  const result = await getCreator(handle, cursor).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (result instanceof CommunityReadError && result.status === 400) return <HubShell><p className="hub-notice">This page link has expired or is invalid. <Link href={`/workshop/creators/${encodeURIComponent(handle)}`}>Start from the creator’s latest page.</Link></p></HubShell>;
  if (!result || typeof result !== "object" || !("profile" in result)) return <HubShell><HubReadFailure error={result} /></HubShell>;
  const { profile, projects } = result as Awaited<ReturnType<typeof getCreator>>;
  if (profile.handle !== handle) permanentRedirect(`/workshop/creators/${profile.handle}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  const avatar = profile.avatarMediaId ? (await getMedia(profile.avatarMediaId).catch(() => null))?.derivatives.find(item => item.name === "card") : null;
  const links = profile.links.map(link => ({ ...link, url: safeHttpUrl(link.url) })).filter(link => link.url);
  return <HubShell><p className="hub-back"><Link href="/workshop/browse">← Browse</Link></p>
    <header className="hub-creator-head">
      {avatar ? <Image className="hub-avatar" unoptimized src={avatar.url} width={avatar.width} height={avatar.height} alt="" referrerPolicy="no-referrer" /> : <span className="hub-avatar hub-avatar-blank" aria-hidden="true">{profile.handle.slice(0, 1).toUpperCase()}</span>}
      <div className="hub-creator-body"><p className="hub-kicker">COMMUNITY CREATOR · SINCE {formatDate(profile.createdAtUtc).toUpperCase()}</p><h1>@{profile.handle}</h1>
        {profile.bio && <p className="hub-creator-bio">{profile.bio}</p>}
        {links.length > 0 && <div className="hub-links">{links.map(link => <a key={link.url} className="hub-link-chip" href={link.url!} target="_blank" rel="noopener noreferrer nofollow ugc"><GlobeIcon size={13} />{link.label}</a>)}</div>}</div>
    </header>
    <section className="hub-shelf" aria-label="Published creations"><div className="hub-section-head"><h2>Creations</h2></div>
      {projects.items.length ? <div className="hub-grid">{projects.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div> : <p className="hub-notice">No published creations on this page yet.</p>}
      <nav className="hub-pagination hub-actions" aria-label="Creator project pages">{cursor && <Link className="btn btn-ghost btn-small" href={`/workshop/creators/${profile.handle}`}>First page</Link>}
        {projects.nextCursor && <Link className="btn btn-ghost btn-small" href={`/workshop/creators/${profile.handle}?cursor=${encodeURIComponent(projects.nextCursor)}`}>More creations →</Link>}</nav>
    </section></HubShell>;
}
