import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, CodeIcon, SearchIcon, ServerRackIcon, DiscordIcon } from "@/components/icons";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { WorkshopIcon } from "@/components/community/workshop-icon";
import { ProjectCard } from "@/components/community/project-card";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Workshop", description: "Discover and share resources, gamemodes, maps and interfaces built for OPEN//77 servers.", path: "/workshop" });

export default async function CommunityPage() {
  const results = await Promise.allSettled([
    listProjects({ sort: "featured", limit: 1 }), listProjects({ sort: "trending", limit: 8 }),
    listProjects({ sort: "new", limit: 8 }), listProjects({ sort: "updated", limit: 4 }), listProjects({ kind: "showcase", limit: 4 }),
  ]);
  const shelves = results.map(result => result.status === "fulfilled" ? result.value : null);
  const seen = new Set<string>();
  const sections = [
    { title: "Featured", href: "/workshop/browse?sort=featured", featured: true },
    { title: "Trending this week", href: "/workshop/browse?sort=trending" },
    { title: "New in the library", href: "/workshop/browse?sort=new" },
    { title: "Recently updated", href: "/workshop/browse?sort=updated" },
    { title: "Showcases", href: "/workshop/browse?kind=showcase" },
  ].map((section, index) => {
    const shelf = shelves[index];
    const request = results[index];
    const items = (index === 1 && !shelf?.rankingAsOfUtc ? [] : shelf?.items ?? []).filter(project => !seen.has(project.projectId));
    items.forEach(project => seen.add(project.projectId));
    return { ...section, items, unavailable: shelf === null, error: request?.status === "rejected" ? request.reason : undefined };
  });
  const allDown = shelves.every(shelf => shelf === null);
  const empty = !allDown && shelves.every(shelf => shelf !== null) && seen.size === 0;
  return <HubShell>
    <header className="workshop-hero">
      <div className="workshop-hero-art" aria-hidden="true"><Image src="/assets/artwork/workshop-street-v1.webp" alt="" fill sizes="(max-width: 700px) 100vw, 60vw" preload /></div>
      <div className="workshop-hero-copy"><p className="hub-kicker">COMMUNITY MADE. YOURS TO BUILD WITH.</p>
        <h1>Your world.<br /><em>More possibilities.</em></h1>
        <p>Give your server its own identity. Discover resources, remix ideas and share what you create with the OPEN//77 community.</p>
        <form className="workshop-search" action="/workshop/browse" role="search" aria-label="Search the Workshop">
          <SearchIcon size={20} /><label className="hub-sr-only" htmlFor="workshop-search">Search resources</label>
          <input id="workshop-search" type="search" name="query" maxLength={200} placeholder="Find your next resource…" />
          <button type="submit" aria-label="Search the Workshop"><ArrowRightIcon size={20} /></button>
        </form>
        <div className="workshop-hero-links"><Link href="/workshop/browse">Explore all creations <ArrowRightIcon size={15} /></Link><Link href="/docs/server-resources">New to resources?</Link></div>
      </div>
      <span className="workshop-art-caption" aria-hidden="true">BUILT BY THE COMMUNITY.<br />MADE FOR NIGHT CITY.</span>
    </header>
    <nav className="workshop-categories" aria-label="Categories">{categories.map(category =>
      <Link key={category.id} href={`/workshop/browse?category=${category.id}`}><WorkshopIcon category={category.id} /><span><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRightIcon size={16} /></Link>)}
    </nav>
    <div className="workshop-library-head"><div><p className="hub-kicker">THE COMMUNITY LIBRARY</p><h2>Find your next building block.</h2></div><Link href="/workshop/browse">Browse everything <ArrowRightIcon size={16} /></Link></div>
    {allDown && <HubReadFailure error={results[0].status === "rejected" ? results[0].reason : undefined} />}
    {sections.map(section => section.items.length > 0 || (section.unavailable && !allDown) ? <section className="hub-shelf" key={section.href}>
      <div className="hub-section-head"><h2>{section.title}</h2><Link href={section.href}>View all →</Link></div>
      {section.unavailable ? <HubReadFailure error={section.error} /> : section.featured && section.items[0] ? <ProjectCard project={section.items[0]} wide /> :
        <div className="hub-grid hub-grid-4">{section.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>}
    </section> : null)}
    {empty && <div className="hub-empty"><span className="hub-kicker">EMPTY LIBRARY</span><h2>Nothing published yet.</h2><p>The first community resources will appear here as they are reviewed. Bring something you have built and help get things started.</p><Link className="btn btn-primary" href="/account/creations/new">Share your first creation</Link></div>}
    <section className="hub-ctas">
      <div className="hub-cta"><CodeIcon size={26} /><p className="hub-kicker">MAKE SOMETHING YOURS</p><h2>Built something good?</h2><p>Share a ZIP or import a GitHub release. Give other creators a head start.</p><Link href="/account/creations/new">Share a creation <ArrowRightIcon size={16} /></Link></div>
      <div className="hub-cta"><ServerRackIcon size={26} /><p className="hub-kicker">FROM IDEA TO IN-GAME</p><h2>Meet Warden.</h2><p>Install, update and roll back resources, right from your server console.</p><Link href="/docs/community-hub-warden">Installation guide <ArrowRightIcon size={16} /></Link></div>
      <div className="hub-cta"><DiscordIcon size={26} /><p className="hub-kicker">BETTER TOGETHER</p><h2>Find your people.</h2><p>Trade ideas, get a hand with your project and build alongside the community.</p><a href="https://discord.open2077.net" target="_blank" rel="noopener noreferrer">Join the Discord <ArrowRightIcon size={16} /></a></div>
    </section>
  </HubShell>;
}
