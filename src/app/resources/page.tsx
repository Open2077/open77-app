import Link from "next/link";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { HubShell } from "@/components/community/hub-shell";
import { ProjectCard } from "@/components/community/project-card";
import { DirectoryFilters } from "@/components/community/directory-filters";
import { CommunityReadError, listProjects } from "@/lib/community/public-api";
import { categories, categoryLabel, type CommunityDirectoryQuery } from "@/lib/community/types";
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
  const sortLabel = directorySorts.find(sort => sort.id === filters.sort)?.label ?? "Newest";
  const heading = filters.category ? categoryLabel(filters.category) : filters.kind === "showcase" ? "Showcases" : filters.kind === "resource" ? "Downloadable resources" : "Community library";
  return <HubShell wide>
    <header className="hub-page-head hub-page-head-compact"><div><p className="hub-kicker">COMMUNITY LIBRARY</p><h1>{heading}</h1></div></header>
    <DirectoryFilters filters={filters} toolbar />
    <div className="hub-layout"><DirectoryFilters filters={filters} rail /><div className="hub-results">
      <div className="hub-results-bar"><span>{catalog ? `${catalog.items.length}${catalog.nextCursor || cursor ? "+" : ""} creations` : "—"}{filters.query ? ` for “${filters.query}”` : ""}</span><span className="hub-results-sort">{sortLabel}</span></div>
      {filters.sort === "trending" && catalog && <p className="hub-footnote">{catalog.rankingAsOfUtc ? `Ranking calculated ${new Date(catalog.rankingAsOfUtc).toISOString().replace("T", " ").slice(0, 16)} UTC from seven days of activity.` : "The first ranking calculation is pending; creations with equal scores are ordered by project ID."}</p>}
      {catalog === null ? invalid ? <div className="hub-notice" role="alert"><p>This page expired or the filters are invalid. Use up to five lowercase tags, or start from the first page.</p><Link href={`/resources?${directoryQuery(filters)}`}>Start from first page →</Link></div> : <HubReadFailure error={result} /> : catalog.items.length ? <>
        <div className="hub-grid">{catalog.items.map(project => <ProjectCard key={project.projectId} project={project} />)}</div>
        <div className="hub-pagination hub-actions">{cursor && <Link className="btn btn-ghost btn-small" href={`/resources?${directoryQuery(filters)}`}>First page</Link>}{catalog.nextCursor && <Link className="btn btn-ghost btn-small" href={`/resources?${directoryQuery({ ...filters, cursor: catalog.nextCursor })}`}>Next page →</Link>}</div>
      </> : <div className="hub-empty"><span className="hub-kicker">{filtered ? "NO MATCHES" : "EMPTY LIBRARY"}</span><h2>{filtered ? "No creations match these filters." : "The library is just getting started."}</h2><p>{filtered ? "Try another search, remove a filter, or explore every category." : "Published community creations will appear here."}</p><Link className="btn btn-ghost btn-small" href={filtered ? "/resources" : "/account/creations/new"}>{filtered ? "Show everything" : "Share a creation"}</Link></div>}
    </div></div>
  </HubShell>;
}
