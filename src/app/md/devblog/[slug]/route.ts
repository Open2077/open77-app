import { blogHref, getBlogPosts, getBlogPostMarkdown } from "@/lib/devblog";
import { markdownResponse } from "@/lib/markdown-response";

/**
 * `/devblog/<slug>.md` — the raw Markdown twin of a devblog post, rewritten
 * here from `next.config.ts` exactly like the documentation twins.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return markdownResponse(await getBlogPostMarkdown(slug), blogHref(slug));
}
