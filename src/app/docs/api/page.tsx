import Link from "next/link";

import { AgentNote } from "@/components/docs/agent-note";
import { ApiSearch, type ApiSearchItem } from "@/components/docs/api-search";
import { DocPager } from "@/components/docs/doc-pager";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex, namespaceLabel, stripInlineMarkdown } from "@/lib/api-reference";
import { getDocsManifest, getDocsNeighbours } from "@/lib/docs";
import {
  breadcrumbNode,
  collectionPageNode,
  itemListNode,
  jsonLdGraph,
  pageMetadata,
} from "@/lib/seo";

const DESCRIPTION =
  "Complete reference for the OPEN//77 Lua API: every registered function on the dedicated server and the client, separated by runtime so an authoritative call is never confused with a client projection.";

export const metadata = pageMetadata({
  title: "Lua API reference",
  description: DESCRIPTION,
  path: "/docs/api",
  markdownPath: "/docs/api.md",
});

export default async function ApiIndexPage() {
  const [api, manifest, neighbours] = await Promise.all([
    getApiIndex(),
    getDocsManifest(),
    getDocsNeighbours("api"),
  ]);

  // A search hit is one line, so its summary is flattened to plain prose here
  // rather than shipping a Markdown renderer to the browser for it.
  const searchItems: ApiSearchItem[] = api.entries.map((entry) => ({
    qualified: entry.qualified,
    signature: entry.signature,
    summary: stripInlineMarkdown(entry.summary),
    href: entry.href,
    runtime: entry.runtime,
    namespace: namespaceLabel(entry.namespace),
  }));

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "API reference" }]}
        title="Lua API reference"
        lede={DESCRIPTION}
        meta={
          <>
            <span>{api.count} functions</span>
            <span>{api.namespaces.length} namespaces</span>
            <span>
              Generated from the platform bindings,{" "}
              <time dateTime={manifest.syncedAt}>
                {new Date(manifest.syncedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </span>
            <a href="/docs/api.md">Markdown</a>
          </>
        }
      >
        <p className="dx-lede">
          Functions are grouped by namespace, one page each, and every function has its own anchor.
          Use the filter to jump straight to a signature.
        </p>

        <ApiSearch items={searchItems} />

        {api.runtimes.map((group) => (
          <section className="dx-api-runtime" key={group.runtime} id={group.runtime}>
            <div className="dx-fn-head">
              <h2 className="dx-nav-title">{group.label} runtime</h2>
              <span className={`dx-runtime-chip dx-runtime-${group.runtime}`}>
                {group.count} functions
              </span>
            </div>
            <p className="dx-card-desc">{group.blurb}</p>
            <div className="dx-ns-grid">
              {group.namespaces.map((namespace) => (
                <Link className="dx-ns-card" href={namespace.href} key={namespace.href}>
                  <span className="dx-ns-name">{namespace.label}</span>
                  <span className="dx-ns-count">{namespace.entries.length}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <AgentNote markdownHref="/docs/api.md" />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          collectionPageNode({
            name: "OPEN//77 Lua API reference",
            description: DESCRIPTION,
            path: "/docs/api",
          }),
          itemListNode({
            name: "OPEN//77 Lua API namespaces",
            path: "/docs/api",
            items: api.namespaces.map((namespace) => ({
              name: `${namespace.runtime} · ${namespace.label}`,
              path: namespace.href,
            })),
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "API reference", path: "/docs/api" },
          ]),
        )}
      />
    </>
  );
}
