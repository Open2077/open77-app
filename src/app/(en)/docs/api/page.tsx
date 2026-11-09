import { ApiExplorer } from "@/components/docs/api-explorer";
import { JsonLd } from "@/components/json-ld";
import { getApiIndex } from "@/lib/api-reference";
import { breadcrumbNode, collectionPageNode, itemListNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

const DESCRIPTION = "Browse the OPEN//77 Lua API by category, namespace and client or server runtime. Search functions and read their signatures, parameters, return values and examples.";
export const metadata = pageMetadata({ title: "Lua API Reference", description: DESCRIPTION, path: "/docs/api", markdownPath: "/docs/api.md" });

export default async function ApiIndexPage() {
  const api = await getApiIndex();
  return (
    <>
      <ApiExplorer entries={api.entries} />
      <JsonLd data={jsonLdGraph(
        collectionPageNode({ name: "OPEN//77 Lua API reference", description: DESCRIPTION, path: "/docs/api" }),
        itemListNode({ name: "API namespaces", path: "/docs/api", items: api.namespaces.map((namespace) => ({ name: `${namespace.label} (${namespace.runtime})`, path: namespace.href })) }),
        breadcrumbNode([{ name: "Home", path: "/" }, { name: "Documentation", path: "/docs" }, { name: "API Reference", path: "/docs/api" }]),
      )} />
    </>
  );
}
