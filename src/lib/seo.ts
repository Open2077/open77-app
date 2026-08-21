import type { Metadata } from "next";

import { GAME_BUILD, GAME_EXPANSION } from "@/lib/requirements";
import { IS_PRODUCTION_DEPLOY, SITE_URL, absoluteUrl, site } from "@/lib/site";

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
  const title = input.title ? `${input.title} — ${site.name}` : `${site.name} — Cyberpunk 2077 Multiplayer`;
  const image = absoluteUrl(input.image ?? site.ogImage);
  const canonical = absoluteUrl(input.path);

  return {
    title,
    description: input.description,
    alternates: {
      canonical,
      ...(input.markdownPath
        ? { types: { "text/markdown": absoluteUrl(input.markdownPath) } }
        : {}),
    },
    openGraph: {
      type: input.type ?? "website",
      siteName: site.name,
      locale: site.locale,
      title,
      description: input.description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: `${site.name} — ${input.title ?? site.tagline}` }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
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
    ].filter((url): url is string => url !== null),
  };
}

export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: SITE_URL,
    description: site.description,
    inLanguage: site.lang,
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
 * no claim about availability: there is no download, no price and no rating, so
 * none of those properties are emitted.
 */
export function softwareApplicationNode(): JsonLdNode {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: site.name,
    applicationCategory: "GameApplication",
    applicationSubCategory: "Multiplayer game modification",
    operatingSystem: "Windows",
    softwareVersion: "pre-alpha",
    description:
      "A multiplayer platform for Cyberpunk 2077 built around a native client, community-operated " +
      "dedicated servers, and scriptable Lua resources. Requires a legally owned copy of Cyberpunk 2077.",
    url: SITE_URL,
    author: { "@id": ORGANIZATION_ID },
    isAccessibleForFree: true,
    requirements: `A legally owned copy of Cyberpunk 2077 ${GAME_BUILD} with ${GAME_EXPANSION}, on 64-bit Windows`,
  };
}

export function breadcrumbNode(trail: { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.path),
    })),
  };
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
    assemblyVersion: "pre-alpha",
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
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(input.path)}#page`,
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: site.lang,
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
