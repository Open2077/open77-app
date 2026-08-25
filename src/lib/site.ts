/**
 * Single source of truth for everything the site says about itself.
 *
 * Outbound links that do not exist yet are `null` rather than a placeholder
 * URL: the community page promises "no fake buttons", and a null forces callers
 * to render a disabled state instead of a dead anchor.
 */

import brandAssets from "./brand-assets.json";

/**
 * Canonical origin. Always the production origin, even on preview deployments,
 * so canonical URLs and structured data never point at a throwaway host.
 */
export const SITE_URL = "https://open2077.net";

/** True only for the production deployment; previews are excluded from indexing. */
export const IS_PRODUCTION_DEPLOY =
  process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production";

export const site = {
  name: "OPEN//77",
  /** Used where "//" would be read as a comment or a path separator. */
  plainName: "OPEN77",
  url: SITE_URL,
  locale: "en_US",
  lang: "en",
  themeColor: "#080E19",
  stage: "PRE-ALPHA",
  tagline: "Cyberpunk 2077 multiplayer. Find a world to play in — or build your own.",
  description:
    "OPEN//77 lets you play Cyberpunk 2077 online on community servers — or create your own server and multiplayer experience. Roleplay, racing, combat, freeroam: pick a world, press connect.",
  /**
   * One-paragraph statement of what this site covers, for llms.txt and for the
   * Organization description in structured data.
   */
  summary:
    "OPEN//77 is an open, community-run multiplayer platform for Cyberpunk 2077. It is not a single " +
    "server: it is the client, dedicated server and scripting layer that lets communities host and " +
    "script their own persistent Night City worlds. This site documents the platform and its Lua API, " +
    "and hosts the server browser. The project is pre-alpha and unaffiliated with CD PROJEKT RED.",
  disclaimer:
    "OPEN//77 is an unofficial, independent community project. It is not affiliated with, endorsed by, " +
    "or sponsored by CD PROJEKT S.A. “Cyberpunk”, “Cyberpunk 2077” and related marks are trademarks of " +
    "CD PROJEKT S.A. Game imagery is used for illustration of a fan project. Playing on OPEN//77 will " +
    "always require your own legal copy of Cyberpunk 2077 — the platform does not accept piracy, and " +
    "pirated or cracked copies are neither supported nor welcome.",
  /**
   * The ?v= content hash moves the URL whenever the card is regenerated:
   * Discord, Telegram and the CDN all cache link previews per URL and would
   * otherwise keep showing the old image forever.
   */
  ogImage: `/brand/social/og-card-1200x630.png?v=${brandAssets.ogCard}`,
  links: {
    /**
     * The platform repository is not public yet, so this is `null` rather than
     * a URL that returns 404. Several wiki guides reference files that live
     * there; the docs pipeline renders those as filenames instead of links
     * while this is null, and turns them back into links the moment it is set.
     */
    platformRepo: null as string | null,
    siteRepo: "https://github.com/Open2077/open77-app",
    /** The one official community — everything is discussed there directly. */
    discord: "https://discord.open2077.net" as string | null,
    x: "https://x.com/open2077" as string | null,
    tiktok: "https://www.tiktok.com/@open2077_network" as string | null,
    devlog: "/devblog" as string | null,
  },
} as const;

/**
 * Absolute URL for a site-relative path.
 *
 * The trailing slash is stripped because the site is served with
 * `trailingSlash: false` and Next's canonical tags follow that. `new URL` turns
 * `/` into `https://open2077.net/`, which would make the sitemap describe the
 * home page with a different string than its own canonical tag does — the same
 * page counted as two.
 */
export function absoluteUrl(pathname: string): string {
  if (/^https?:\/\//.test(pathname)) return pathname;
  return new URL(pathname, SITE_URL).toString().replace(/\/$/, "");
}

/** Primary navigation, shared by the header, the mobile menu and the sitemap. */
export const mainNav = [
  { href: "/servers", label: "Servers" },
  { href: "/create", label: "Create a Server" },
  { href: "/docs", label: "Docs" },
  { href: "/devblog", label: "Devblog" },
  { href: "/community", label: "Community" },
] as const;

export const footerNav = [
  {
    title: "Play",
    links: [
      { href: "/servers", label: "Server browser" },
      { href: "/docs/platform#how-it-works", label: "How it works" },
      { href: "/docs/platform#faq", label: "FAQ" },
    ],
  },
  {
    title: "Create",
    links: [
      { href: "/create", label: "Create a server" },
      { href: "/docs/platform#dedicated-servers", label: "Dedicated servers" },
      { href: "/docs/server-resources", label: "Resources & scripting" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/docs/platform#roadmap", label: "Status & roadmap" },
      { href: "/devblog", label: "Devblog" },
      { href: "/community", label: "Community" },
      { href: "/docs", label: "Documentation" },
      { href: "/brand", label: "Brand kit" },
    ],
  },
  {
    title: "Follow",
    links: [
      { href: "https://discord.open2077.net", label: "Discord" },
      { href: "https://x.com/open2077", label: "X / Twitter" },
      { href: "https://www.tiktok.com/@open2077_network", label: "TikTok" },
    ],
  },
] as const;
