import { apiNamespaceToMarkdown, getApiIndex, getApiNamespace } from "@/lib/api-reference";
import { markdownResponse } from "@/lib/markdown-response";

/** `/docs/api/<runtime>/<namespace>.md` — one namespace as Markdown. */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const api = await getApiIndex();
  return api.namespaces.map((entry) => ({ runtime: entry.runtime, namespace: entry.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runtime: string; namespace: string }> },
) {
  const { runtime, namespace: slug } = await params;
  const namespace = await getApiNamespace(runtime, slug);
  if (!namespace) return markdownResponse(null, `/docs/api/${runtime}/${slug}`);
  return markdownResponse(apiNamespaceToMarkdown(namespace), namespace.href);
}
