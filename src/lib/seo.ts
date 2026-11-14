import type { Metadata } from "next";

import { formatBytes } from "@/lib/cdn";
import type { LauncherRelease } from "@/lib/launcher-release";
import { GAME_BUILD, GAME_EXPANSION } from "@/lib/requirements";
import { IS_PRODUCTION_DEPLOY, SITE_URL, absoluteUrl, site } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, isLocalizedPath, localizeHref, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

/**
 * hreflang alternates for an English path that exists in every language, or
 * undefined for English-only pages. English is also `x-default`: it is what a
 * visitor whose language is not offered should land on.
 */
export function languageAlternates(path: string): Record<string, string> | undefined {
  if (!isLocalizedPath(path)) return undefined;
  const languages: Record<string, string> = { "x-default": absoluteUrl(path) };
  for (const locale of LOCALES) languages[LOCALE_INFO[locale].tag] = absoluteUrl(localizeHref(path, locale));
  return languages;
}

type PageMetadataInput = {
  /** Page title without the site suffix. Omit on the home page. */
  title?: string;
  description: string;
  /** Site-relative path, used for the canonical URL. */
  path: string;
  /** Site-relative or absolute image URL. Defaults to the brand OG card. */
  image?: string;
  /** Marks documentation pages as articles rather than website pages. */
  type?: "website" | "article";
  /** Machine-readable variant of the page, advertised to LLM and agent clients. */
  markdownPath?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** The page language; `path` stays the English path and the canonical follows the language. */
  locale?: Locale;
};

/**
 * Builds the metadata for one route.
 *
 * Every page gets a canonical URL, because the legacy site shipped `.html`
 * URLs that now redirect here and duplicate content is the fastest way to lose
 * the ranking those URLs already earned. Preview deployments are marked
 * noindex so they never compete with production.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const meta = getMessages(locale).meta;
  const subtitle = meta.subtitle;
  const title = input.title ? `${input.title} · ${site.name}` : `${site.name} · ${subtitle}`;
  // Link previews carry the styled name; the <title> stays plain for search.
  const shareTitle = input.title ? `${input.title} · ${site.socialName}` : `${site.socialName} · ${subtitle}`;
  const image = absoluteUrl(input.image ?? site.ogImage);
  const canonical = absoluteUrl(localizeHref(input.path, locale));
  const languages = languageAlternates(input.path);

  return {
    // The root layout applies a "%s — site" template; an absolute title keeps the suffix from doubling.
    title: { absolute: title },
    description: input.description,
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
      ...(input.markdownPath
        ? { types: { "text/markdown": absoluteUrl(input.markdownPath) } }
        : {}),
    },
    openGraph: {
      type: input.type ?? "website",
      siteName: site.socialName,
      locale: LOCALE_INFO[locale].og,
      ...(languages
        ? { alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => LOCALE_INFO[other].og) }
        : {}),
      title: shareTitle,
      description: input.description,
      url: canonical,
      images: [{ url: image, ...site.ogImageSize, alt: `${site.name}: ${input.title ?? meta.tagline}` }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: input.description,
      images: [image],
    },
    robots: IS_PRODUCTION_DEPLOY
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: false },
  };
}

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

type JsonLdNode = Record<string, unknown>;

/**
 * The publisher. Kept deliberately thin: no employee counts, founding dates or
 * social profiles are asserted, because none of them are verifiable facts about
 * this project yet and structured data that contradicts the page is treated as
 * a quality problem.
 */
export function organizationNode(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.name,
    alternateName: site.plainName,
    url: SITE_URL,
    description: site.summary,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/brand/logo/open77-logo-dark-2000.png"),
      width: 2000,
      height: 303,
    },
    // Only profiles that actually resolve: `sameAs` pointing at a 404 is worse
    // than a shorter list.
    sameAs: [
      site.links.platformRepo,
      site.links.siteRepo,
      site.links.discord,
      site.links.x,
      site.links.tiktok,
      site.links.twitch,
      site.links.youtube,
    ].filter((url): url is string => url !== null),
  };
}

export function websiteNode(locale: Locale = DEFAULT_LOCALE): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: SITE_URL,
    description: getMessages(locale).meta.description,
    inLanguage: LOCALE_INFO[locale].tag,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/docs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The platform itself. `SoftwareApplication` is honest here as long as it makes
 * no claim about availability: this node describes OPEN//77 as a whole, which
 * has no single artefact, no price and no rating, so none of those properties
 * are emitted. The one thing that *is* downloadable — the launcher — gets its
 * own node below, with the real version and URL attached.
 */
export function softwareApplicationNode(): JsonLdNode {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: site.name,
    applicationCategory: "GameApplication",
    applicationSubCategory: "Multiplayer game modification",
    operatingSystem: "Windows",
    softwareVersion: site.stageLabel,
    description:
      "A multiplayer platform for Cyberpunk 2077 built around a native client, community-operated " +
      "dedicated servers, and scriptable Lua resources. Requires a legally owned copy of Cyberpunk 2077.",
    url: SITE_URL,
    author: { "@id": ORGANIZATION_ID },
    isAccessibleForFree: true,
    requirements: `A legally owned copy of Cyberpunk 2077 ${GAME_BUILD} with ${GAME_EXPANSION}, on 64-bit Windows`,
  };
}

/**
 * The player launcher, as an actual downloadable artefact.
 *
 * Every field here is read from the CDN's release pointer at build time rather
 * than written down, because structured data that names a stale version is
 * worse than structured data that names none. The node is only emitted when a
 * release was resolved, so the page never claims a download it cannot serve.
 */
export function launcherApplicationNode(release: LauncherRelease): JsonLdNode {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#launcher`,
    name: `${site.name} Launcher`,
    applicationCategory: "GameApplication",
    applicationSubCategory: "Game launcher and mod manager",
    operatingSystem: "Windows 10, Windows 11, Linux (64-bit)",
    softwareVersion: release.version,
    url: absoluteUrl("/download"),
    installUrl: absoluteUrl("/download"),
    downloadUrl: release.url,
    description:
      "The OPEN//77 launcher signs you in, verifies your Cyberpunk 2077 build, installs and " +
      "updates the OPEN//77 client, manages which mods load, and connects you to community servers.",
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": WEBSITE_ID },
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    requirements: `A legally owned copy of Cyberpunk 2077 ${GAME_BUILD} with ${GAME_EXPANSION}, on 64-bit Windows or Linux`,
    ...(release.sizeBytes !== null ? { fileSize: formatBytes(release.sizeBytes) } : {}),
    ...(release.publishedAtUtc ? { datePublished: release.publishedAtUtc } : {}),
  };
}

export function breadcrumbNode(trail: { name: string; path: string }[], locale: Locale = DEFAULT_LOCALE): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(localizeHref(entry.path, locale)),
    })),
  };
}

/** Marks a page's own node with its language (`WebPage`, `SoftwareApplication`…). */
export function withLanguage(node: JsonLdNode, locale: Locale): JsonLdNode {
  return { ...node, inLanguage: LOCALE_INFO[locale].tag };
}

export function faqNode(entries: { question: string; answer: string }[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function techArticleNode(input: {
  headline: string;
  description: string;
  path: string;
  section?: string;
  wordCount?: number;
  dateModified?: string;
}): JsonLdNode {
  return {
    "@type": "TechArticle",
    "@id": `${absoluteUrl(input.path)}#article`,
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: site.lang,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    author: { "@id": ORGANIZATION_ID },
    ...(input.section ? { articleSection: input.section } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

/**
 * The devblog as a whole. Lives on the index page; the posts point back at it
 * through `isPartOf` so crawlers see one blog, not a scatter of articles.
 */
export function blogNode(input: { description: string; path: string }): JsonLdNode {
  return {
    "@type": "Blog",
    "@id": `${absoluteUrl(input.path)}#blog`,
    name: `${site.name} Devblog`,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: site.lang,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function blogPostingNode(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  keywords?: string[];
  wordCount?: number;
}): JsonLdNode {
  return {
    "@type": "BlogPosting",
    "@id": `${absoluteUrl(input.path)}#post`,
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    inLanguage: site.lang,
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    isPartOf: { "@id": `${absoluteUrl("/devblog")}#blog` },
    publisher: { "@id": ORGANIZATION_ID },
    author: { "@id": ORGANIZATION_ID },
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
  };
}

export function apiReferenceNode(input: {
  name: string;
  description: string;
  path: string;
  namespace: string;
  runtime: string;
}): JsonLdNode {
  return {
    "@type": "APIReference",
    "@id": `${absoluteUrl(input.path)}#api`,
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: site.lang,
    programmingLanguage: "Lua",
    assemblyVersion: site.stageLabel,
    executableLibraryName: input.namespace,
    targetPlatform: `OPEN//77 ${input.runtime} runtime`,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * A page that exists to list other things.
 *
 * Used where the listed entities themselves must not be described in structured
 * data — the server browser being the case in point, since its listings are
 * demo data and marking them up would assert that they are real.
 */
export function collectionPageNode(input: {
  name: string;
  description: string;
  path: string;
  locale?: Locale;
}): JsonLdNode {
  const url = absoluteUrl(localizeHref(input.path, input.locale ?? DEFAULT_LOCALE));
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    name: input.name,
    description: input.description,
    url,
    inLanguage: LOCALE_INFO[input.locale ?? DEFAULT_LOCALE].tag,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function itemListNode(input: {
  name: string;
  path: string;
  items: { name: string; path: string }[];
}): JsonLdNode {
  return {
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/** Wraps nodes into a single `@graph` document, which is what crawlers prefer. */
export function jsonLdGraph(...nodes: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
