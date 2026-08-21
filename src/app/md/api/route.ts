import { apiNamespaceToMarkdown, getApiIndex } from "@/lib/api-reference";
import { markdownResponse } from "@/lib/markdown-response";

/**
 * `/docs/api.md` — the entire Lua API as one Markdown document.
 *
 * The whole reference in a single fetch, because an agent trying to write a
 * resource wants the complete surface, not 38 requests. It is the largest
 * document on the site by some margin, which is exactly why it is a file and
 * not a page.
 */
export const dynamic = "force-static";

export async function GET() {
  const api = await getApiIndex();

  const sections = [
    "# OPEN//77 Lua API reference",
    "",
    `${api.count} registered functions across ${api.namespaces.length} namespaces, generated from the platform bindings.`,
    "",
    "Functions are grouped by runtime. A name that appears in both runtimes is not the same function: " +
      "the server entry is authoritative, the client entry is a local projection.",
    "",
  ];

  for (const group of api.runtimes) {
    sections.push(`## ${group.label} runtime`, "", group.blurb, "");
    for (const namespace of group.namespaces) {
      sections.push(apiNamespaceToMarkdown(namespace, 3));
    }
  }

  return markdownResponse(`${sections.join("\n")}\n`, "/docs/api");
}
