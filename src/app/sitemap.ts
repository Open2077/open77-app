import type { MetadataRoute } from "next";

import { getApiIndex } from "@/lib/api-reference";
import { blogHref, getBlogPosts } from "@/lib/devblog";
import { docHref, getDocsManifest, getDocsPages } from "@/lib/docs";
import { serverDirectory } from "@/lib/servers";
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
    serverDirectory.list(),
    getDocsManifest(),
    getBlogPosts(),
  ]);

  const docsModified = new Date(manifest.syncedAt);

  const marketing: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly" },
    // `/download` is absent on purpose, exactly like `/host`: both serve a real
    // build to anyone holding the link, and both are unlisted until the alpha
    // opens. A sitemap entry is a request to index, and a page Google surfaces
    // is not unlisted in any sense a reader would recognise. The page also
    // carries `robots: index: false`; the two must be added back together.
    { url: absoluteUrl("/servers"), changeFrequency: "daily" },
    { url: absoluteUrl("/create"), changeFrequency: "monthly" },
    { url: absoluteUrl("/community"), changeFrequency: "monthly" },
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

  // The listings are demo data, so the detail pages are included but marked as
  // rarely changing: they are real URLs with real content, they just are not
  // live statistics.
  const serverPages: MetadataRoute.Sitemap = servers.map((server) => ({
    url: absoluteUrl(`/servers/${server.id}`),
    changeFrequency: "monthly",
  }));

  return [...marketing, ...devblog, ...docs, ...apiPages, ...serverPages];
}
