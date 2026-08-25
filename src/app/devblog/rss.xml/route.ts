import { blogHref, getBlogPosts } from "@/lib/devblog";
import { absoluteUrl, site } from "@/lib/site";

/**
 * The devblog RSS feed.
 *
 * Prerendered like every other devblog surface: the feed only changes when a
 * post is committed, and a commit triggers a build. `description` carries the
 * post's own meta description — the feed is a notification channel, the full
 * text lives on the page (and in its Markdown twin for machine readers).
 */
export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const posts = await getBlogPosts();

  const items = posts
    .map((post) => {
      const url = absoluteUrl(blogHref(post.slug));
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${new Date(`${post.date}T18:00:00Z`).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.description)}</description>`,
        ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const feed = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${site.name} Devblog`)}</title>`,
    `    <link>${absoluteUrl("/devblog")}</link>`,
    `    <atom:link href="${absoluteUrl("/devblog/rss.xml")}" rel="self" type="application/rss+xml"/>`,
    `    <description>${escapeXml(
      "Development updates from OPEN//77, the community multiplayer platform for Cyberpunk 2077.",
    )}</description>`,
    `    <language>${site.lang}</language>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
