import type { MetadataRoute } from "next";

import { getApiIndex } from "@/lib/api-reference";
import { blogHref, getBlogPosts } from "@/lib/devblog";
import { docHref, getDocsManifest, getDocsPages } from "@/lib/docs";
import { listPublicServers } from "@/lib/server-catalog";

export const revalidate = 300;
import { absoluteUrl } from "@/lib/site";

/**
 * The sitemap.
 *
 * `lastModified` is honest or absent. The marketing pages carry the deploy date
 * because that is genuinely when their copy last changed; documentation pages
 * carry the wiki sync timestamp, which is the real provenance of their content.
 * Nothing gets a freshly generated "now" to look recently updated, because a
 * sitemap that claims every page changed on every deploy teaches crawlers to
 * ignore the field.
 *
 * `priority` is deliberately omitted: Google has stated it ignores it, and a
 * hand-tuned ladder of numbers is noise.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, api, servers, manifest, posts] = await Promise.all([
    getDocsPages(),
    getApiIndex(),
    listPublicServers().catch(() => []),
    getDocsManifest(),
    getBlogPosts(),
  ]);

  const docsModified = new Date(manifest.syncedAt);

  const marketing: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly" },
    // `/download` is listed and indexable again, together with its `robots`
    // metadata and its navigation entries — the three go as one set. `/host` is
    // still absent: the dedicated-server download stays behind its gate.
    // Weekly, because the page's content is a release pointer, not prose.
    { url: absoluteUrl("/download"), changeFrequency: "weekly" },
    { url: absoluteUrl("/servers"), changeFrequency: "daily" },
    { url: absoluteUrl("/status"), changeFrequency: "hourly" },
    { url: absoluteUrl("/dev-tracker"), changeFrequency: "daily" },
    { url: absoluteUrl("/dev-tracker/approved"), changeFrequency: "daily" },
    { url: absoluteUrl("/dev-tracker/roadmap"), changeFrequency: "daily" },
    { url: absoluteUrl("/create"), changeFrequency: "monthly" },
    { url: absoluteUrl("/workshop"), changeFrequency: "daily" },
    { url: absoluteUrl("/workshop/browse"), changeFrequency: "daily" },
    { url: absoluteUrl("/brand"), changeFrequency: "yearly" },
  ];

  // A post's `lastModified` is its own date: posts are append-only, so the
  // date in the filename is the real provenance. The index changes daily —
  // a new post lands with every digest.
  const newestPost = posts[0];
  const devblog: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/devblog"),
      changeFrequency: "daily",
      ...(newestPost ? { lastModified: new Date(`${newestPost.date}T18:00:00Z`) } : {}),
    },
    ...posts.map((post) => ({
      url: absoluteUrl(blogHref(post.slug)),
      lastModified: new Date(`${post.date}T18:00:00Z`),
      changeFrequency: "monthly" as const,
    })),
  ];

  const docs: MetadataRoute.Sitemap = pages.map((page) => ({
    url: absoluteUrl(docHref(page.slug)),
    lastModified: docsModified,
    changeFrequency: "weekly",
  }));

  const apiPages: MetadataRoute.Sitemap = api.namespaces.map((namespace) => ({
    url: absoluteUrl(namespace.href),
    lastModified: docsModified,
    changeFrequency: "weekly",
  }));

  // Public server profiles have real prerendered content and their own metadata.
  const serverPages: MetadataRoute.Sitemap = servers.map((server) => ({
    url: absoluteUrl(`/servers/${server.id}`),
    changeFrequency: "daily",
  }));

  return [...marketing, ...devblog, ...docs, ...apiPages, ...serverPages];
}
