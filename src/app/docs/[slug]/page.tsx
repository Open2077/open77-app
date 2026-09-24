import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import { NpcCatalogue } from "@/components/docs/npc-catalogue";
import { JsonLd } from "@/components/json-ld";
import {
  docMarkdownHref,
  getDocsManifest,
  getDocsNeighbours,
  getDocsPages,
  getGuide,
} from "@/lib/docs";
import { breadcrumbNode, jsonLdGraph, pageMetadata, techArticleNode } from "@/lib/seo";

/** Only the guides listed in `meta.json` exist; anything else is a static 404. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await getDocsPages();
  return pages
    .filter((page) => page.kind === "guide" && page.slug !== "index")
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) {
    return pageMetadata({
      title: "Page not found",
      description: "This documentation page does not exist.",
      path: `/docs/${slug}`,
    });
  }

  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/docs/${slug}`,
    type: "article",
    markdownPath: docMarkdownHref(slug),
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [guide, manifest, neighbours] = await Promise.all([
    getGuide(slug),
    getDocsManifest(),
    getDocsNeighbours(slug),
  ]);
  if (!guide) notFound();

  return (
    <>
      <DocsShell
        breadcrumbs={[
          { label: "Docs", href: "/docs" },
          { label: guide.sectionTitle },
          { label: guide.nav },
        ]}
        title={guide.title}
        lede={guide.description}
        meta={
          <>
            <span>{guide.readingMinutes} min read</span>
            <span>{guide.wordCount.toLocaleString("en-GB")} words</span>
            <a href={docMarkdownHref(slug)}>Markdown</a>
            {slug === "gizmos" ? (
              <Link href="/docs/api/client/open77-gizmos">Client Lua API</Link>
            ) : null}
            {slug === "cyberware" || slug === "gorilla-arms" ? (
              <>
                <Link href="/docs/api/server/open77-cyberware">Server Lua API</Link>
                <Link href="/docs/api/client/open77-cyberware">Client Lua API</Link>
              </>
            ) : null}
            {slug === "attachments" || slug === "player-interactions" ? (
              <>
                <Link href={`/docs/api/server/${slug === "attachments" ? "open77-props" : "open77-playerinteractions"}`}>Server Lua API</Link>
                <Link href={`/docs/api/client/${slug === "attachments" ? "open77-props" : "open77-playerinteractions"}`}>Client Lua API</Link>
                <Link href={slug === "attachments" ? "/docs/player-interactions" : "/docs/attachments"}>
                  {slug === "attachments" ? "Player interactions" : "Synchronized attachments"}
                </Link>
              </>
            ) : null}
            {["npcs", "npc-behavior", "npc-catalogue"].includes(slug) ? (
              <>
                <Link href="/docs/api/server/open77-npcs">Server Lua API</Link>
                <Link href="/docs/api/client/open77-npcs">Client Lua API</Link>
                {slug !== "npc-catalogue" ? <Link href="/docs/npc-catalogue">NPC catalogue</Link> : null}
              </>
            ) : null}
            {slug === "rp-animations" || slug === "rp-animation-catalogue" ? (
              <>
                <Link href="/docs/api/client/open77-animations">Client Lua API</Link>
                <Link href="/docs/api/server/open77-animations">Server Lua API</Link>
              </>
            ) : null}
            {slug === "vehicle-weapons" || slug === "armed-vehicles" ? (
              <>
                <Link href="/docs/api/client/open77-vehicles">Client Lua API</Link>
                <Link href={slug === "vehicle-weapons" ? "/docs/armed-vehicles" : "/docs/vehicle-weapons"}>
                  {slug === "vehicle-weapons" ? "Spawn catalogue" : "Weapon sync guide"}
                </Link>
                <a href="/data/vehicle-weapons-2.31.json" download>Catalogue JSON</a>
              </>
            ) : null}
          </>
        }
        toc={<DocToc entries={guide.toc} />}
      >
        {slug === "npc-catalogue" || slug === "player-model-catalogue" ? <NpcCatalogue /> : null}
        <div className="dx-prose" dangerouslySetInnerHTML={{ __html: guide.html }} />
        <AgentNote markdownHref={docMarkdownHref(slug)} />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          techArticleNode({
            headline: guide.title,
            description: guide.description,
            path: `/docs/${slug}`,
            section: guide.sectionTitle,
            wordCount: guide.wordCount,
            dateModified: manifest.syncedAt,
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: guide.nav, path: `/docs/${slug}` },
          ]),
        )}
      />
    </>
  );
}
