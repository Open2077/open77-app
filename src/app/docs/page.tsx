import { notFound } from "next/navigation";

import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsSearch, type DocsSearchItem } from "@/components/docs/docs-search";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex } from "@/lib/api-reference";
import {
  docHref,
  docMarkdownHref,
  getDocsManifest,
  getDocsNav,
  getDocsNeighbours,
  getDocsSearchIndex,
  getGuide,
} from "@/lib/docs";
import {
  breadcrumbNode,
  collectionPageNode,
  itemListNode,
  jsonLdGraph,
  pageMetadata,
  techArticleNode,
} from "@/lib/seo";

const DESCRIPTION =
  "Documentation for the OPEN//77 platform: the resource model, the authoritative server, player identity, world systems and the complete Lua API reference for both runtimes.";

export const metadata = pageMetadata({
  title: "Documentation",
  description: DESCRIPTION,
  path: "/docs",
  markdownPath: "/docs.md",
});

export default async function DocsHomePage() {
  const [guide, nav, api, manifest, neighbours, searchIndex] = await Promise.all([
    getGuide("index"),
    getDocsNav(),
    getApiIndex(),
    getDocsManifest(),
    getDocsNeighbours("index"),
    getDocsSearchIndex(),
  ]);
  if (!guide) notFound();

  const syncedAt = new Date(manifest.syncedAt);
  const allPages = nav.sections.flatMap((section) => section.pages);

  const searchItems: DocsSearchItem[] = searchIndex
    .filter((entry) => entry.href !== docHref("index"))
    .map((entry) => ({
      ...entry,
      meta:
        entry.href === docHref("api") ? `${api.count} functions` : entry.section,
    }));

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs" }]}
        title="OPEN//77 documentation"
        lede={DESCRIPTION}
        meta={
          <>
            <span>{manifest.guides} guides</span>
            <span>{api.count} API functions</span>
            <span>
              Synced{" "}
              <time dateTime={manifest.syncedAt}>
                {syncedAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>{" "}
              from the platform wiki
            </span>
          </>
        }
        toc={<DocToc entries={guide.toc} />}
      >
        <div className="dx-prose" dangerouslySetInnerHTML={{ __html: guide.html }} />

        <section className="dx-index-section">
          <h2 className="dx-nav-title" id="all-pages">
            All pages
          </h2>
          <DocsSearch entries={searchItems} />
        </section>

        <AgentNote markdownHref={docMarkdownHref("index")} />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({
            name: "OPEN//77 documentation",
            description: DESCRIPTION,
            path: "/docs",
          }),
          techArticleNode({
            headline: guide.title,
            description: guide.description,
            path: "/docs",
            section: "Introduction",
            wordCount: guide.wordCount,
            dateModified: manifest.syncedAt,
          }),
          itemListNode({
            name: "OPEN//77 documentation pages",
            path: "/docs",
            items: allPages.map((page) => ({
              name: page.title ?? page.nav,
              path: docHref(page.slug),
            })),
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
          ]),
        )}
      />
    </>
  );
}
