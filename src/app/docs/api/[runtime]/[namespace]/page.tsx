import { notFound } from "next/navigation";

import { AgentNote } from "@/components/docs/agent-note";
import { ApiEntryCard } from "@/components/docs/api-entry";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex, getApiNamespace } from "@/lib/api-reference";
import type { TocEntry } from "@/lib/docs";
import {
  apiReferenceNode,
  breadcrumbNode,
  itemListNode,
  jsonLdGraph,
  pageMetadata,
} from "@/lib/seo";

/** The namespaces are generated from `api.json`; nothing else is a valid route. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const api = await getApiIndex();
  return api.namespaces.map((namespace) => ({
    runtime: namespace.runtime,
    namespace: namespace.slug,
  }));
}

function describe(namespaceLabel: string, runtime: string, count: number): string {
  return `Every ${runtime}-runtime function in the OPEN//77 ${namespaceLabel} namespace: ${count} signature${
    count === 1 ? "" : "s"
  } with parameters, defaults, return values and the binding each one is registered from.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runtime: string; namespace: string }>;
}) {
  const { runtime, namespace: slug } = await params;
  const namespace = await getApiNamespace(runtime, slug);
  if (!namespace) {
    return pageMetadata({
      title: "Namespace not found",
      description: "This API namespace does not exist.",
      path: `/docs/api/${runtime}/${slug}`,
    });
  }

  return pageMetadata({
    title: `${namespace.label} — ${namespace.runtime} API`,
    description: describe(namespace.label, namespace.runtime, namespace.entries.length),
    path: namespace.href,
    markdownPath: namespace.markdownHref,
    type: "article",
  });
}

export default async function ApiNamespacePage({
  params,
}: {
  params: Promise<{ runtime: string; namespace: string }>;
}) {
  const { runtime, namespace: slug } = await params;
  const namespace = await getApiNamespace(runtime, slug);
  if (!namespace) notFound();

  const api = await getApiIndex();
  const group = api.runtimes.find((entry) => entry.runtime === namespace.runtime);
  const toc: TocEntry[] = namespace.entries.map((entry) => ({
    id: entry.anchor,
    text: entry.name,
    depth: 3,
  }));

  return (
    <>
      <DocsShell
        breadcrumbs={[
          { label: "Docs", href: "/docs" },
          { label: "API reference", href: "/docs/api" },
          { label: `${namespace.runtime} · ${namespace.label}` },
        ]}
        title={namespace.label}
        lede={group?.blurb}
        meta={
          <>
            <span className={`dx-runtime-chip dx-runtime-${namespace.runtime}`}>
              {namespace.runtime} runtime
            </span>
            <span>
              {namespace.entries.length} function{namespace.entries.length === 1 ? "" : "s"}
            </span>
            <a href={namespace.markdownHref}>Markdown</a>
          </>
        }
        toc={<DocToc entries={toc} />}
      >
        <div>
          {namespace.entries.map((entry) => (
            <ApiEntryCard entry={entry} key={entry.anchor} />
          ))}
        </div>

        <AgentNote markdownHref={namespace.markdownHref} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          apiReferenceNode({
            name: `${namespace.label} (${namespace.runtime} runtime)`,
            description: describe(namespace.label, namespace.runtime, namespace.entries.length),
            path: namespace.href,
            namespace: namespace.name,
            runtime: namespace.runtime,
          }),
          itemListNode({
            name: `${namespace.label} functions`,
            path: namespace.href,
            items: namespace.entries.map((entry) => ({
              name: entry.qualified,
              path: entry.href,
            })),
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "API reference", path: "/docs/api" },
            { name: namespace.label, path: namespace.href },
          ]),
        )}
      />
    </>
  );
}
