import Link from "next/link";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Community Hub", description: "Discover and share resources, gamemodes, maps and interfaces built for OPEN//77 servers.", path: "/community" });
export default async function CommunityPage() {
  const results = await Promise.allSettled([
    listProjects({ sort: "featured", limit: 1 }), listProjects({ sort: "trending", limit: 6 }),
    listProjects({ sort: "new", limit: 6 }), listProjects({ sort: "updated", limit: 6 }), listProjects({ kind: "showcase", limit: 3 }),
  ]);
  const shelves = results.map(result => result.status === "fulfilled" ? result.value : null);
  const seen = new Set<string>();
  const sections = [
    { title: "An editorial pick", label: "SELECTED BY OPEN//77", href: "/resources?sort=featured" },
    { title: "Trending this week", label: "COMMUNITY ACTIVITY", href: "/resources?sort=trending" },
    { title: "Fresh from the community", label: "NEW CREATIONS", href: "/resources?sort=new" },
    { title: "Recently updated", label: "KEEP BUILDING", href: "/resources?sort=updated" },
    { title: "A look at what’s possible", label: "COMMUNITY SHOWCASES", href: "/resources?kind=showcase" },
  ].map((section, index) => {
    const shelf = shelves[index];
    const request = results[index];
    const items = (index === 1 && !shelf?.rankingAsOfUtc ? [] : shelf?.items ?? []).filter(project => !seen.has(project.projectId));
    items.forEach(project => seen.add(project.projectId));
    return { ...section, items, unavailable: shelf === null, error: request?.status === "rejected" ? request.reason : undefined };
  });
  const empty = shelves.every(shelf => shelf !== null) && seen.size === 0;
  return <HubShell><header className="hub-hero"><div className="hub-hero-copy">
    <p className="hub-kicker">BUILT BY THE COMMUNITY. MADE FOR YOUR WORLD.</p>
    <h1>Your next idea.<br /><span>Someone’s next server.</span></h1>
    <p>Discover what the OPEN//77 community is building. Share your scripts, shape new spaces, and give other creators a head start.</p>
    <form className="hub-search" action="/resources" role="search"><label className="hub-sr-only" htmlFor="hub-search">Search community resources</label>
      <span aria-hidden="true">⌕</span><input id="hub-search" type="search" name="query" placeholder="Search resources, gamemodes, maps…" maxLength={200} />
      <button type="submit">Explore →</button></form>
  </div><aside className="hub-hero-note"><span className="hub-orbit" aria-hidden="true">{"//"}</span>
    <span className="hub-kicker">DEVELOPER PREVIEW</span><h2>Built to be shared.</h2>
    <p>A script, a new interior, a whole gamemode. Your work can become the starting point for someone else.</p>
    <Link href="/docs/server-resources">Start building ↗</Link></aside></header>
    <nav className="hub-categories" aria-label="Resource categories">{categories.map(category =>
      <Link key={category.id} href={`/resources?category=${category.id}`}><span aria-hidden="true">{category.mark}</span><strong>{category.label}</strong><small>{category.description}</small></Link>)}</nav>
    {sections.map(section => section.items.length > 0 || section.unavailable ? <section className={`hub-section${section.href === "/resources?sort=featured" ? " hub-section-featured" : ""}`} key={section.href}><div className="hub-section-head"><div><p className="hub-kicker">{section.label}</p><h2>{section.title}</h2></div><Link href={section.href}>Explore all ↗</Link></div>
      {section.unavailable ? <HubReadFailure error={section.error} /> : <div className="hub-grid">{section.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>}
    </section> : null)}
    {empty && <div className="hub-empty"><h3>A new home for your creations.</h3><p>The first community resources will appear here as they’re published. Bring something you’ve built and help get things started.</p><Link className="btn btn-primary" href="/account/creations/new">Share your first creation</Link></div>}
    <section className="hub-bottom-band"><div><p className="hub-kicker">ONE COMMUNITY. MORE POSSIBILITIES.</p><h2>Keep the conversation going.</h2><p>For platform development, missing APIs and help from other builders, join the OPEN//77 Discord.</p></div><a className="btn btn-ghost" href="https://discord.open2077.net" target="_blank" rel="noopener noreferrer">Join the community ↗</a></section>
  </HubShell>;
}
