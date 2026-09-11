import Link from "next/link";
import { HubShell, HubUnavailable } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Community resources", description: "Explore scripts, maps, gamemodes and tools for your OPEN//77 server.", path: "/resources" });
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  const query = typeof search.query === "string" ? search.query.slice(0, 200) : "";
  const category = typeof search.category === "string" && categories.some(item => item.id === search.category) ? search.category : "";
  const cursor = typeof search.cursor === "string" ? search.cursor : undefined;
  const catalog = await listProjects({ query, category, cursor }).catch(() => null);
  const next = new URLSearchParams({ ...(query ? { query } : {}), ...(category ? { category } : {}), ...(catalog?.nextCursor ? { cursor: catalog.nextCursor } : {}) });
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">THE COMMUNITY RESOURCE LIBRARY</p><h1>Make it your world.</h1><p>Find the pieces for your next OPEN//77 server.</p></header>
    <form className="hub-directory-filters" action="/resources" role="search">
      <label>Search resources<input name="query" type="search" defaultValue={query} maxLength={200} placeholder="What would you like to build?" /></label>
      <label>Category<select name="category" defaultValue={category}><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <button className="btn btn-primary" type="submit">Find resources</button>{(query || category) && <Link href="/resources">Clear filters</Link>}
    </form>{catalog === null ? <HubUnavailable /> : catalog.items.length ? <>
      <div className="hub-grid">{catalog.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>
      {catalog.nextCursor && <div className="hub-pagination"><Link className="btn btn-ghost" href={`/resources?${next}`}>Next page →</Link></div>}
    </> : <div className="hub-empty"><h2>{query || category ? "No creations match just yet." : "The library is just getting started."}</h2><p>{query || category ? "Try another search or explore all categories." : "Published community creations will appear here."}</p><Link href={query || category ? "/resources" : "/account/creations/new"}>{query || category ? "Explore all resources" : "Share a creation"} →</Link></div>}
  </HubShell>;
}
