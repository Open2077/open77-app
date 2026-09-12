import Link from "next/link";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { DirectoryFilters } from "@/components/community/directory-filters";
import { CommunityReadError, listProjects } from "@/lib/community/public-api";
import { categories, type CommunityDirectoryQuery } from "@/lib/community/types";
import { directoryQuery, directorySorts } from "@/lib/community/directory";
import { pageMetadata } from "@/lib/seo";

type Search = Record<string, string | string[] | undefined>;
export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  return { ...pageMetadata({ title: "Community resources", description: "Explore scripts, maps, gamemodes and tools for your OPEN//77 server.", path: "/resources" }),
    ...(Object.keys(search).length ? { robots: { index: false, follow: true } } : {}) };
}
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const value = (key: string, max = 200) => typeof search[key] === "string" ? search[key].slice(0, max).trim() : "";
  const filters: CommunityDirectoryQuery = { query: value("query"), category: categories.some(item => item.id === value("category")) ? value("category") : "",
    tags: value("tags", 164).split(",").map(tag => tag.trim()).filter(Boolean).join(","), kind: ["resource", "showcase"].includes(value("kind")) ? value("kind") : "",
    build: value("build", 100), hasSource: ["true", "false"].includes(value("hasSource")) ? value("hasSource") : "",
    sort: directorySorts.some(sort => sort.id === value("sort")) ? value("sort") : "new" };
  const cursor = value("cursor", 1100) || undefined;
  const result = await listProjects({ ...filters, cursor }).catch((error: unknown) => error);
  const catalog = result && typeof result === "object" && "items" in result ? result as Awaited<ReturnType<typeof listProjects>> : null;
  const invalid = result instanceof CommunityReadError && result.status === 400;
  const filtered = !!(filters.query || filters.category || filters.tags || filters.kind || filters.build || filters.hasSource);
  return <HubShell><header className="hub-directory-head"><p className="hub-kicker">THE COMMUNITY RESOURCE LIBRARY</p><h1>Make it your world.</h1><p>Find the pieces for your next OPEN//77 server.</p></header>
    <DirectoryFilters filters={filters} />
    {filters.query && <p className="hub-notice">Exact and prefix title matches appear first, followed by other matches in your selected order.</p>}
    {filters.sort === "trending" && catalog && <p className="hub-notice">{catalog.rankingAsOfUtc ? `Ranking calculated ${new Date(catalog.rankingAsOfUtc).toISOString().replace("T", " ").slice(0, 16)} UTC from eligible activity over seven days.` : "The first ranking calculation is pending. Creations with equal scores are ordered by project ID."}</p>}
    {catalog === null ? invalid ? <div className="hub-notice" role="alert"><p>This page expired or the filters are invalid. Use up to five lowercase tags, or start from the first page.</p><Link href={`/resources?${directoryQuery(filters)}`}>Start from first page →</Link></div> : <HubReadFailure error={result} /> : catalog.items.length ? <>
      <div className="hub-grid">{catalog.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>
      <div className="hub-pagination hub-actions">{cursor && <Link className="btn btn-ghost" href={`/resources?${directoryQuery(filters)}`}>First page</Link>}{catalog.nextCursor && <Link className="btn btn-ghost" href={`/resources?${directoryQuery({ ...filters, cursor: catalog.nextCursor })}`}>Next page →</Link>}</div>
    </> : <div className="hub-empty"><h2>{filtered ? "No creations match just yet." : "The library is just getting started."}</h2><p>{filtered ? "Try another search or explore all categories." : "Published community creations will appear here."}</p><Link href={filtered ? "/resources" : "/account/creations/new"}>{filtered ? "Explore all resources" : "Share a creation"} →</Link></div>}
  </HubShell>;
}
