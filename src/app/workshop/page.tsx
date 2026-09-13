import { JsonLd } from "@/components/json-ld";
import { ResourceDirectory } from "@/components/community/resource-directory";
import { listProjects } from "@/lib/community/public-api";
import { directorySorts } from "@/lib/community/directory";
import { breadcrumbNode, collectionPageNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

type Search = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  return { ...pageMetadata({ title: "Workshop", description: "Browse scripts, gamemodes, maps, interfaces and tools for your OPEN//77 server, made by the community.", path: "/workshop" }),
    ...(Object.keys(search).length ? { robots: { index: false, follow: true } } : {}) };
}

/**
 * The library is a full-window directory like the server browser: the first
 * ranked page is rendered here so the HTML carries real rows, then the
 * browser takes over filtering, selection and further pages.
 */
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const requested = typeof search.sort === "string" ? search.sort : "new";
  const sort = directorySorts.some(item => item.id === requested) ? requested : "new";
  const initial = await listProjects({ sort, limit: 100 }).catch(() => null);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (typeof value === "string" && value) query.set(key, value);
  return <>
    <main id="main" className="sb-page"><ResourceDirectory initial={initial} initialSort={sort} initialSearch={query.toString() ? `?${query}` : ""} /></main>
    <JsonLd data={jsonLdGraph(
      collectionPageNode({ name: "OPEN//77 community library", description: "Community-made resources, gamemodes, maps and tools for OPEN//77 servers.", path: "/workshop" }),
      breadcrumbNode([{ name: "Home", path: "/" }, { name: "Community", path: "/workshop/discover" }, { name: "Library", path: "/workshop" }]),
    )} />
  </>;
}
