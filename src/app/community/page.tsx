import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Community Hub", description: "Discover and share resources, gamemodes, maps and interfaces built for OPEN//77 servers.", path: "/community" });

export default async function CommunityPage() {
  const results = await Promise.allSettled([
    listProjects({ sort: "featured", limit: 1 }), listProjects({ sort: "trending", limit: 8 }),
    listProjects({ sort: "new", limit: 8 }), listProjects({ sort: "updated", limit: 4 }), listProjects({ kind: "showcase", limit: 4 }),
  ]);
  const shelves = results.map(result => result.status === "fulfilled" ? result.value : null);
  const seen = new Set<string>();
  const sections = [
    { title: "Featured", href: "/resources?sort=featured", featured: true },
    { title: "Trending this week", href: "/resources?sort=trending" },
    { title: "New in the library", href: "/resources?sort=new" },
    { title: "Recently updated", href: "/resources?sort=updated" },
    { title: "Showcases", href: "/resources?kind=showcase" },
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
    <header className="hub-page-head hub-page-head-entry"><div><p className="hub-kicker">RESOURCES FOR SERVER BUILDERS</p>
      <h1>Build your server. Share what you create.</h1>
      <p>Scripts, gamemodes, maps, interfaces and tools made by the OPEN//77 community, plus the official resources. Free to download, ready for your world.</p></div>
      <div className="hub-page-head-actions"><Link className="btn btn-primary" href="/resources">Browse the library</Link><Link className="btn btn-ghost" href="/docs/server-resources">How resources work</Link></div></header>
    <form className="hub-toolbar" action="/resources" role="search" aria-label="Search the community library">
      <label className="hub-search"><SearchIcon size={15} /><span className="hub-sr-only">Search resources</span>
        <input type="search" name="query" maxLength={200} placeholder="Search resources, gamemodes, maps, tools…" /></label>
      <button className="btn btn-primary btn-small hub-toolbar-go" type="submit">Search</button>
    </form>
    <nav className="hub-modes" aria-label="Categories">{categories.map(category =>
      <Link key={category.id} className="hub-chip" href={`/resources?category=${category.id}`}>{category.label}</Link>)}
      <Link className="hub-chip" href="/resources?kind=showcase">Showcases</Link></nav>
    {allDown && <HubReadFailure error={results[0].status === "rejected" ? results[0].reason : undefined} />}
    {sections.map(section => section.items.length > 0 || (section.unavailable && !allDown) ? <section className="hub-shelf" key={section.href}>
      <div className="hub-section-head"><h2>{section.title}</h2><Link href={section.href}>View all →</Link></div>
      {section.unavailable ? <HubReadFailure error={section.error} /> : section.featured && section.items[0] ? <ProjectCard project={section.items[0]} wide /> :
        <div className="hub-grid hub-grid-4">{section.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>}
    </section> : null)}
    {empty && <div className="hub-empty"><span className="hub-kicker">EMPTY LIBRARY</span><h2>Nothing published yet.</h2><p>The first community resources will appear here as they are reviewed. Bring something you have built and help get things started.</p><Link className="btn btn-primary" href="/account/creations/new">Share your first creation</Link></div>}
    <section className="hub-ctas">
      <div className="hub-cta"><p className="hub-kicker">FOR CREATORS</p><h2>Share what you built</h2><p>Upload a ZIP or import a GitHub release, add screenshots, and let server owners install it through Warden.</p><Link className="btn btn-ghost btn-small" href="/account/creations/new">Start a creation</Link></div>
      <div className="hub-cta"><p className="hub-kicker">FOR SERVER OWNERS</p><h2>Install with Warden</h2><p>Browse the Hub from your server console, review the plan, then install, update or roll back with one confirmation.</p><Link className="btn btn-ghost btn-small" href="/docs/community-hub-warden">Read the Warden guide</Link></div>
      <div className="hub-cta"><p className="hub-kicker">NEED HELP?</p><h2>Ask the community</h2><p>Platform bugs, missing APIs and general help live on the OPEN//77 Discord.</p><a className="btn btn-ghost btn-small" href="https://discord.open2077.net" target="_blank" rel="noopener noreferrer">Join the Discord ↗</a></div>
    </section>
  </HubShell>;
}
