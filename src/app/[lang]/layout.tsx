import type { Metadata, Viewport } from "next";

import "@/styles/system.css";
import { SiteDocument } from "@/components/site/site-document";
import { LOCALE_INFO } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { languageParams, layoutLocale } from "@/i18n/route";
import { IS_PRODUCTION_DEPLOY, SITE_URL, site } from "@/lib/site";

/**
 * Root layout of the translated site (`/fr`, `/es`, `/pt-br`, `/de`, `/pl`,
 * `/ru`, `/tr`). Only the pages listed in `LOCALIZED_ROUTES` exist under it;
 * English keeps its unprefixed URLs in the `(en)` group.
 *
 * The seven prefixes are generated here, but `dynamicParams = false` lives on
 * each fixed page rather than on this layout: Next applies a `false` from any
 * segment to the whole route, which would 404 every on-demand server profile
 * (`/fr/servers/<id>`). An unknown prefix that still reaches a page is a 404
 * through the page's `routeLocale()` (never this layout's: see `layoutLocale`);
 * a path that is no page at all gets the global 404, in the prefix's language
 * (see the proxy).
 */
export function generateStaticParams() {
  return languageParams();
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = await layoutLocale(params);
  const meta = getMessages(locale).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${site.name} · ${meta.subtitle}`, template: `%s · ${site.name}` },
    description: meta.description,
    applicationName: site.name,
    generator: "Next.js",
    referrer: "strict-origin-when-cross-origin",
    authors: [{ name: site.name, url: SITE_URL }],
    creator: site.name,
    publisher: site.name,
    category: "games",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "256x256" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: site.socialName,
      locale: LOCALE_INFO[locale].og,
      title: `${site.socialName} · ${meta.subtitle}`,
      description: meta.description,
      images: [{ url: site.ogImage, ...site.ogImageSize, alt: `${site.name}: ${meta.tagline}` }],
    },
    twitter: { card: "summary_large_image", title: `${site.socialName} · ${meta.subtitle}`, images: [site.ogImage] },
    robots: IS_PRODUCTION_DEPLOY ? { index: true, follow: true } : { index: false, follow: false },
    other: { "project:stage": site.stage },
  };
}

export const viewport: Viewport = {
  themeColor: "#FCEE0A",
  colorScheme: "dark",
};

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const locale = await layoutLocale(params);
  return <SiteDocument locale={locale}>{children}</SiteDocument>;
}
