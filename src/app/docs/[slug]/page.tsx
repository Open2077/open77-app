import { notFound } from "next/navigation";

import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
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
          </>
        }
        toc={<DocToc entries={guide.toc} />}
      >
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
