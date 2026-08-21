import { getGuideMarkdown } from "@/lib/docs";
import { markdownResponse } from "@/lib/markdown-response";

/**
 * `/docs.md` — the documentation home as Markdown.
 *
 * Reached through a rewrite so the public URL is the page's URL plus `.md`,
 * which is the convention agents and answer engines probe for.
 */
export const dynamic = "force-static";

export async function GET() {
  const markdown = await getGuideMarkdown("index");
  return markdownResponse(markdown, "/docs");
}
