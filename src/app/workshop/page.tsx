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
      <div className="workshop-hero-copy"><p className="hub-kicker">RESOURCES FOR SERVER BUILDERS</p>
        <h1>Build your server.<br /><em>Share what you create.</em></h1>
        <p>Scripts, gamemodes, maps, interfaces and tools made by the OPEN//77 community, plus the official resources. Free to download, ready for your world.</p>
        <form className="workshop-search" action="/workshop/browse" role="search" aria-label="Search the Workshop">
          <SearchIcon size={20} /><label className="hub-sr-only" htmlFor="workshop-search">Search resources</label>
          <input id="workshop-search" type="search" name="query" maxLength={200} placeholder="Search resources, gamemodes, maps, tools…" />
          <button type="submit" aria-label="Search the Workshop"><ArrowRightIcon size={20} /></button>
        </form>
        <div className="workshop-hero-links"><Link href="/workshop/browse">Browse the Workshop <ArrowRightIcon size={15} /></Link><Link href="/docs/server-resources">How resources work</Link></div>
      </div>
      <span className="workshop-art-caption" aria-hidden="true">FREE TO DOWNLOAD.<br />INSTALLED THROUGH WARDEN.</span>
    </header>
    <nav className="workshop-categories" aria-label="Categories">{categories.map(category =>
      <Link key={category.id} href={`/workshop/browse?category=${category.id}`}><WorkshopIcon category={category.id} /><span><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRightIcon size={16} /></Link>)}
    </nav>
    <div className="workshop-library-head"><div><p className="hub-kicker">THE LIBRARY</p><h2>What the community has published.</h2></div><Link href="/workshop/browse">Browse everything <ArrowRightIcon size={16} /></Link></div>
    {allDown && <HubReadFailure error={results[0].status === "rejected" ? results[0].reason : undefined} />}
    {sections.map(section => section.items.length > 0 || (section.unavailable && !allDown) ? <section className="hub-shelf" key={section.href}>
      <div className="hub-section-head"><h2>{section.title}</h2><Link href={section.href}>View all →</Link></div>
      {section.unavailable ? <HubReadFailure error={section.error} /> : section.featured && section.items[0] ? <ProjectCard project={section.items[0]} wide /> :
        <div className="hub-grid hub-grid-4">{section.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>}
    </section> : null)}
    {empty && <div className="hub-empty"><span className="hub-kicker">EMPTY LIBRARY</span><h2>Nothing published yet.</h2><p>The first community resources will appear here as they are reviewed. Bring something you have built and help get things started.</p><Link className="btn btn-primary" href="/account/creations/new">Share your first creation</Link></div>}
    <section className="hub-ctas">
      <div className="hub-cta"><CodeIcon size={26} /><p className="hub-kicker">FOR CREATORS</p><h2>Share what you built.</h2><p>Upload a ZIP or import a GitHub release, add screenshots, and let server owners install it through Warden.</p><Link href="/account/creations/new">Start a creation <ArrowRightIcon size={16} /></Link></div>
      <div className="hub-cta"><ServerRackIcon size={26} /><p className="hub-kicker">FOR SERVER OWNERS</p><h2>Install with Warden.</h2><p>Browse the Workshop from your server console, review the plan, then install, update or roll back with one confirmation.</p><Link href="/docs/community-hub-warden">Read the Warden guide <ArrowRightIcon size={16} /></Link></div>
      <div className="hub-cta"><DiscordIcon size={26} /><p className="hub-kicker">NEED HELP?</p><h2>Ask the community.</h2><p>Platform bugs, missing APIs and general help live on the OPEN//77 Discord.</p><a href="https://discord.open2077.net" target="_blank" rel="noopener noreferrer">Join the Discord <ArrowRightIcon size={16} /></a></div>
    </section>
  </HubShell>;
}
