import { getDocsPages, getGuideMarkdown } from "@/lib/docs";
import { licensingToMarkdown } from "@/lib/licensing-content";
import { markdownResponse } from "@/lib/markdown-response";
import { platformToMarkdown } from "@/lib/platform-content";

/** `/docs/<slug>.md` — one documentation page as Markdown. */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await getDocsPages();
  return pages
    .filter((page) => page.slug !== "index" && page.slug !== "api")
    .map((page) => ({ slug: page.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // `platform` is authored in TSX rather than Markdown, so its Markdown twin is
  // projected from the same content module the page renders from.
  if (slug === "platform") {
    return markdownResponse(platformToMarkdown(), "/docs/platform");
  }

  // Also authored in TSX, its Markdown twin projected from the content module.
  if (slug === "server-licensing") {
    return markdownResponse(licensingToMarkdown(), "/docs/server-licensing");
  }

  return markdownResponse(await getGuideMarkdown(slug), `/docs/${slug}`);
}
