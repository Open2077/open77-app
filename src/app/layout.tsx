import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Rajdhani, Saira } from "next/font/google";

import { JsonLd } from "@/components/json-ld";
import { MotionEffects } from "@/components/motion-effects";
import { SiteHeader } from "@/components/site-header";
import { jsonLdGraph, organizationNode, websiteNode } from "@/lib/seo";
import { IS_PRODUCTION_DEPLOY, SITE_URL, absoluteUrl, site } from "@/lib/site";
import "@/styles/globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const saira = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-saira",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} — Cyberpunk 2077 Multiplayer`,
    template: `%s — ${site.name}`,
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
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: SITE_URL,
    title: `${site.name} — Cyberpunk 2077 Multiplayer`,
    description: site.description,
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: { card: "summary_large_image", images: [site.ogImage] },
  robots: IS_PRODUCTION_DEPLOY ? { index: true, follow: true } : { index: false, follow: false },
  other: {
    // Read by the docs surfaces and by anyone auditing what stage this is.
    "project:stage": site.stage,
  },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.lang} className={`${rajdhani.variable} ${saira.variable} ${plexMono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <MotionEffects />
        <JsonLd data={jsonLdGraph(organizationNode(), websiteNode())} />
      </body>
    </html>
  );
}
