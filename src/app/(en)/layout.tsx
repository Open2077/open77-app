import type { Metadata, Viewport } from "next";

import "@/styles/system.css";
import { SiteDocument } from "@/components/site/site-document";
import { IS_PRODUCTION_DEPLOY, SITE_URL, absoluteUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} · Cyberpunk 2077 Multiplayer`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  publisher: site.name,
  category: "games",
  alternates: {
    canonical: "/",
    types: { "text/plain": absoluteUrl("/llms.txt") },
  },
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
    locale: site.locale,
    url: SITE_URL,
    title: `${site.socialName} · Cyberpunk 2077 Multiplayer`,
    description: site.description,
    images: [{ url: site.ogImage, ...site.ogImageSize, alt: `${site.name}: ${site.tagline}` }],
  },
  twitter: { card: "summary_large_image", title: `${site.socialName} · Cyberpunk 2077 Multiplayer`, images: [site.ogImage] },
  robots: IS_PRODUCTION_DEPLOY ? { index: true, follow: true } : { index: false, follow: false },
  other: {
    // Read by the docs surfaces and by anyone auditing what stage this is.
    "project:stage": site.stage,
  },
};

export const viewport: Viewport = {
  // Pages rewrite this with their tone as the visitor moves through the site.
  themeColor: "#FCEE0A",
  colorScheme: "dark",
};

/**
 * Root layout of the English site: every page that has no language prefix,
 * including the English-only sections (docs, devblog, workshop, admin…). The
 * other languages have their own root layout under `[lang]`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="en">{children}</SiteDocument>;
}
