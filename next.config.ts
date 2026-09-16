import type { NextConfig } from "next";

/**
 * Legacy URL map.
 *
 * The static site shipped `.html` URLs that are already indexed and linked from
 * outside. They are permanent redirects so the ranking follows the new path
 * instead of being split across two URLs.
 *
 * `docs.html` maps to `/docs/platform`, not `/docs`: the old page *was* the
 * platform explainer, and it carried the `#how-it-works`, `#dedicated-servers`,
 * `#resources`, `#roadmap` and `#faq` anchors that live on that page now. A
 * browser re-applies the fragment after a redirect, so those deep links survive.
 */
const LEGACY_PAGES: Record<string, string> = {
  "/index.html": "/",
  "/servers.html": "/servers",
  "/create.html": "/create",
  "/community.html": "/workshop",
  "/brand.html": "/brand",
  "/docs.html": "/docs/platform",
};

const IMMUTABLE_ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The header advertises the framework and version to anyone scanning; it buys
  // nothing here.
  poweredByHeader: false,

  images: {
    // AVIF first, WebP as the fallback: the hero and section art are large
    // photographic JPEGs, which is exactly where AVIF's advantage shows up, and
    // Largest Contentful Paint on those images is a ranking input.
    formats: ["image/avif", "image/webp"],
  },

  /**
   * Markdown twins.
   *
   * The convention answer engines and coding agents probe for is "the page URL
   * plus `.md`", but a route segment cannot carry an extension in the App
   * Router, so the handlers live under `/md/*` and are rewritten into place.
   * Rewrites keep the pretty URL and are resolved before routing, so the
   * prerendered file is what gets served.
   *
   * Order matters: the API patterns are listed before the generic guide pattern,
   * which would otherwise swallow `api.md`.
   */
  async rewrites() {
    return [
      { source: "/docs.md", destination: "/md/docs" },
      { source: "/docs/api.md", destination: "/md/api" },
      {
        source: "/docs/api/:runtime/:namespace.md",
        destination: "/md/api/:runtime/:namespace",
      },
      { source: "/docs/:slug.md", destination: "/md/docs/:slug" },
      { source: "/devblog/:slug.md", destination: "/md/devblog/:slug" },
    ];
  },

  async redirects() {
    return [
      ...Object.entries(LEGACY_PAGES).map(([source, destination]) => ({
        source,
        destination,
        permanent: true,
      })),
      // `server.html?id=night-city-rp` was how the old detail page was reached.
      {
        source: "/server.html",
        has: [{ type: "query" as const, key: "id", value: "(?<serverId>.+)" }],
        destination: "/servers/:serverId",
        permanent: true,
      },
      { source: "/server.html", destination: "/servers", permanent: true },
      // The community resource library moved under /workshop (2026-09-13).
      { source: "/community", destination: "/workshop", permanent: true },
      { source: "/community/sitemap.xml", destination: "/workshop/sitemap.xml", permanent: true },
      { source: "/community/sitemaps/:path*", destination: "/workshop/sitemaps/:path*", permanent: true },
      { source: "/resources", destination: "/workshop/browse", permanent: true },
      { source: "/workshop/discover", destination: "/workshop", permanent: true },
      { source: "/resources/:path*", destination: "/workshop/:path*", permanent: true },
      { source: "/creators/:handle", destination: "/workshop/creators/:handle", permanent: true },
      // The 2026-09-15 devblog post was first published under an unpadded date
      // (2026-9-15), which the post loader ignores. The Discord announcements
      // already link to that slug, so it and its Markdown twin redirect to the
      // corrected one.
      {
        source: "/devblog/2026-9-15-bucket-paint-polyzone-launcher",
        destination: "/devblog/2026-09-15-bucket-paint-polyzone-launcher",
        permanent: true,
      },
      {
        source: "/devblog/2026-9-15-bucket-paint-polyzone-launcher.md",
        destination: "/devblog/2026-09-15-bucket-paint-polyzone-launcher.md",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Nothing here asks for a camera, a microphone or a location.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Brand and screenshot files are content-addressed by name only, so they
        // get a day of browser caching and a month of CDN revalidation rather
        // than `immutable`, which would strand a corrected asset.
        source: "/:dir(assets|brand)/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_ASSET_CACHE }],
      },
      {
        // The machine-readable surfaces exist to be fetched by crawlers, agents
        // and answer engines, including from a browser context on another
        // origin. Without CORS those fetches fail for no good reason.
        source: "/:path*.md",
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/:path(llms.txt|llms-full.txt)",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
