import { Eyebrow } from "@/components/brand";
import { DownloadIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Brand Kit",
  description:
    "Official OPEN//77 brand assets: logo, // mark, favicons, avatars and social banners. Download the full kit.",
  path: "/brand",
});

type BrandTile = {
  preview: string;
  previewAlt: string;
  /** Extra class controlling the preview's padding and scale. */
  previewClass?: string;
  tone: "bt-dark" | "bt-light";
  caption: string;
  note?: string;
  banner?: boolean;
  downloads: { href: string; label: string }[];
};

const LOGO_TILES: BrandTile[] = [
  {
    preview: "/brand/logo/open77-logo-dark-2000.png",
    previewAlt: "OPEN//77 lockup, pale letters with cyan slashes on dark",
    tone: "bt-dark",
    caption: "Logo on dark",
    note: "PNG lockup",
    downloads: [{ href: "/brand/logo/open77-logo-dark-2000.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-logo-light-2000.png",
    previewAlt: "OPEN//77 lockup, navy letters with cyan slashes on light",
    tone: "bt-light",
    caption: "Logo on light",
    note: "PNG lockup",
    downloads: [{ href: "/brand/logo/open77-logo-light-2000.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-monogram-1024.png",
    previewAlt: "The 77 from the painted lockup",
    previewClass: "bt-mark",
    tone: "bt-dark",
    caption: "The 77 monogram",
    note: "raster",
    downloads: [{ href: "/brand/logo/open77-monogram-1024.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-mark-1024.png",
    previewAlt: "The //77 mark cut from the painted lockup",
    previewClass: "bt-mark",
    tone: "bt-dark",
    caption: "The //77 mark",
    note: "raster",
    downloads: [{ href: "/brand/logo/open77-mark-1024.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-app-icon.png",
    previewAlt: "OPEN//77 app icon, the painted //77 in a rounded navy square",
    previewClass: "bt-icon",
    tone: "bt-dark",
    caption: "App icon",
    downloads: [{ href: "/brand/logo/open77-app-icon.png", label: "PNG" }],
  },
];

const PROFILE_TILES: BrandTile[] = [
  {
    preview: "/brand/social/avatar-512.png",
    previewAlt: "Avatar, 512 pixels square",
    previewClass: "bt-icon",
    tone: "bt-dark",
    caption: "Avatar 512",
    note: "Discord",
    downloads: [
      { href: "/brand/social/avatar-1024.png", label: "1024" },
      { href: "/brand/social/avatar-512.png", label: "512" },
      { href: "/brand/social/avatar-200.png", label: "200" },
      { href: "/brand/social/avatar-circle-1024.png", label: "circle" },
    ],
  },
  {
    preview: "/brand/favicon/favicon-48.png",
    previewAlt: "Favicon, 48 pixels square",
    previewClass: "bt-favicon",
    tone: "bt-dark",
    caption: "Favicons",
    downloads: [
      { href: "/brand/favicon/favicon.svg", label: "SVG" },
      { href: "/brand/favicon/favicon.ico", label: "ICO" },
      { href: "/brand/favicon/favicon-32.png", label: "32" },
      { href: "/brand/favicon/favicon-16.png", label: "16" },
    ],
  },
  {
    preview: "/brand/favicon/apple-touch-icon.png",
    previewAlt: "Apple touch icon, 180 pixels square",
    previewClass: "bt-icon",
    tone: "bt-dark",
    caption: "Touch icon 180",
    downloads: [{ href: "/brand/favicon/apple-touch-icon.png", label: "PNG" }],
  },
];

const BANNER_TILES: BrandTile[] = [
  {
    preview: "/brand/social/og-card-1200x630.png",
    previewAlt: "Link preview card, 1200 by 630",
    tone: "bt-dark",
    caption: "Link preview (OG) 1200×630",
    banner: true,
    downloads: [{ href: "/brand/social/og-card-1200x630.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-x-1500x500.png",
    previewAlt: "X header, 1500 by 500",
    tone: "bt-dark",
    caption: "X / Twitter header 1500×500",
    banner: true,
    downloads: [{ href: "/brand/social/banner-x-1500x500.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-discord-1920x1080.png",
    previewAlt: "Discord invite splash, 1920 by 1080",
    tone: "bt-dark",
    caption: "Discord invite splash 1920×1080",
    banner: true,
    downloads: [
      { href: "/brand/social/banner-discord-1920x1080.png", label: "PNG" },
      { href: "/brand/social/banner-discord-server-960x540.png", label: "server 960×540" },
    ],
  },
  {
    preview: "/brand/social/banner-youtube-2560x1440.png",
    previewAlt: "YouTube banner, 2560 by 1440",
    tone: "bt-dark",
    caption: "YouTube banner 2560×1440",
    banner: true,
    downloads: [{ href: "/brand/social/banner-youtube-2560x1440.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-tiktok-1080x1920.png",
    previewAlt: "TikTok vertical card, 1080 by 1920",
    tone: "bt-dark",
    caption: "TikTok vertical 1080×1920",
    banner: true,
    downloads: [{ href: "/brand/social/banner-tiktok-1080x1920.png", label: "PNG" }],
  },
];

const PALETTE = [
  { name: "Void Navy", hex: "#080E19" },
  { name: "Lockup Cyan", hex: "#00F7FC" },
  { name: "OPEN Electric", hex: "#22D8E2" },
  { name: "Signal Ice", hex: "#70F3F5" },
  { name: "Cold White", hex: "#F2F6F8" },
  { name: "Signal Coral", hex: "#FF5964" },
];

function BrandTiles({ tiles, className }: { tiles: BrandTile[]; className: string }) {
  return (
    <div className={className}>
      {tiles.map((tile) => (
        <figure
          className={`brand-tile ${tile.tone}${tile.banner ? " bt-banner" : ""}`}
          key={tile.caption}
        >
          {/*
            Brand assets are shown exactly as authored, so these are plain
            <img> elements: routing them through the image optimizer would
            re-encode the very files people are here to download and compare.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.preview}
            alt={tile.previewAlt}
            loading="lazy"
            decoding="async"
            {...(tile.previewClass ? { className: tile.previewClass } : {})}
          />
          <figcaption>
            {tile.caption}
            {tile.note ? <span className="bt-note">{tile.note}</span> : null}
            <span className="bt-links">
              {tile.downloads.map((download) => (
                <a key={download.href + download.label} href={download.href} download>
                  {download.label}
                </a>
              ))}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function BrandPage() {
  return (
    <>
      <main id="main">
        <section className="page-hero page-hero-plain">
          <div className="section-inner">
            <Eyebrow>BRAND KIT</Eyebrow>
            <h1 className="page-title">The OPEN//77 mark.</h1>
            <p className="section-lead">
              Painted lockup (PNG), the <strong>{"//77"}</strong> mark and <strong>77</strong>{" "}
              monogram cut from it, favicons, avatars and social banners — everything in one
              download, plus individual files below.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="/brand/open77-brand-kit.zip" download>
                Download full kit (.zip)
                <DownloadIcon />
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <Eyebrow>LOGO</Eyebrow>
            <h2 className="section-title">Wordmark &amp; mark.</h2>
            <BrandTiles tiles={LOGO_TILES} className="brand-grid" />
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <Eyebrow>AVATARS &amp; FAVICONS</Eyebrow>
            <h2 className="section-title">Profile marks.</h2>
            <BrandTiles tiles={PROFILE_TILES} className="brand-grid brand-grid-4" />
          </div>
        </section>

        <section className="section">
          <div className="section-inner section-inner-wide">
            <Eyebrow>BANNERS</Eyebrow>
            <h2 className="section-title">Social headers.</h2>
            <BrandTiles tiles={BANNER_TILES} className="brand-grid brand-grid-banners" />
            <p className="brand-note">
              Colors:{" "}
              {PALETTE.map((colour, index) => (
                <span key={colour.hex}>
                  {index > 0 ? " · " : ""}
                  {colour.name} <code>{colour.hex}</code>
                </span>
              ))}
              . The painted lockup uses one cyan. Product UI splits the same{" "}
              <strong>{"//"}</strong> into Ice and Electric.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Brand Kit", path: "/brand" },
          ]),
        )}
      />
    </>
  );
}
