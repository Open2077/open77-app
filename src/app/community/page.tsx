import Link from "next/link";
import { HubShell, HubUnavailable } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Community Hub", description: "Discover and share resources, gamemodes, maps and interfaces built for OPEN//77 servers.", path: "/community" });
export default async function CommunityPage() {
  const catalog = await listProjects({ limit: 6 }).catch(() => null);
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
    <section className="hub-section"><div className="hub-section-head"><div><p className="hub-kicker">FROM THE COMMUNITY</p><h2>Find your next addition.</h2></div><Link href="/resources">Explore all ↗</Link></div>
      {catalog === null ? <HubUnavailable /> : catalog.items.length ? <div className="hub-grid">{catalog.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div> :
        <div className="hub-empty"><h3>A new home for your creations.</h3><p>The first community resources will appear here as they’re published. Bring something you’ve built and help get things started.</p><Link className="btn btn-primary" href="/account/creations/new">Share your first creation</Link></div>}
    </section><section className="hub-bottom-band"><div><p className="hub-kicker">ONE COMMUNITY. MORE POSSIBILITIES.</p><h2>Keep the conversation going.</h2><p>For platform development, missing APIs and help from other builders, join the OPEN//77 Discord.</p></div><a className="btn btn-ghost" href="https://discord.open2077.net" target="_blank" rel="noopener noreferrer">Join the community ↗</a></section>
  </HubShell>;
}
