import type { Metadata, Viewport } from "next";

import "@/styles/system.css";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { fontVariables } from "@/lib/fonts";
import { jsonLdGraph, organizationNode, websiteNode } from "@/lib/seo";
import { IS_PRODUCTION_DEPLOY, SITE_URL, absoluteUrl, site } from "@/lib/site";

import noiseStyles from "@/components/site/noise.module.css";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.lang} dir="ltr" suppressHydrationWarning>
      <body className={fontVariables}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
        <div className={noiseStyles.noise} aria-hidden="true" />
        <JsonLd data={jsonLdGraph(organizationNode(), websiteNode())} />
      </body>
    </html>
  );
}
