import type { CSSProperties } from "react";

import { CtaLink } from "@/components/downloads/cta-link";
import { JsonLd } from "@/components/json-ld";
import { CopyButton } from "@/components/ui/code-block";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { download02 } from "@/components/ui/icons";
import { Page, PageHero, Section } from "@/components/ui/page";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

import styles from "./brand.module.css";

export const metadata = pageMetadata({
  title: "Brand Kit",
  description:
    "Official OPEN//77 brand assets: logo, // mark, favicons, avatars and social banners. Download the full kit.",
  path: "/brand",
});

type BrandTile = {
  preview: string;
  previewAlt: string;
  /** How the preview sits in its tile: a lockup fills the width, marks and icons are centred and smaller. */
  fit?: "mark" | "icon" | "favicon" | "tall";
  surface: "dark" | "light";
  caption: string;
  note?: string;
  downloads: { href: string; label: string }[];
};

const LOGO_TILES: BrandTile[] = [
  {
    preview: "/brand/logo/open77-logo-dark-2000.png",
    previewAlt: "OPEN//77 lockup, pale letters with cyan slashes on dark",
    surface: "dark",
    caption: "Logo on dark",
    note: "PNG lockup",
    downloads: [{ href: "/brand/logo/open77-logo-dark-2000.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-logo-light-2000.png",
    previewAlt: "OPEN//77 lockup, navy letters with cyan slashes on light",
    surface: "light",
    caption: "Logo on light",
    note: "PNG lockup",
    downloads: [{ href: "/brand/logo/open77-logo-light-2000.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-monogram-1024.png",
    previewAlt: "The 77 from the painted lockup",
    fit: "mark",
    surface: "dark",
    caption: "The 77 monogram",
    note: "raster",
    downloads: [{ href: "/brand/logo/open77-monogram-1024.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-mark-1024.png",
    previewAlt: "The //77 mark cut from the painted lockup",
    fit: "mark",
    surface: "dark",
    caption: "The //77 mark",
    note: "raster",
    downloads: [{ href: "/brand/logo/open77-mark-1024.png", label: "PNG" }],
  },
  {
    preview: "/brand/logo/open77-app-icon.png",
    previewAlt: "OPEN//77 app icon, the painted //77 in a rounded navy square",
    fit: "icon",
    surface: "dark",
    caption: "App icon",
    downloads: [{ href: "/brand/logo/open77-app-icon.png", label: "PNG" }],
  },
];

const PROFILE_TILES: BrandTile[] = [
  {
    preview: "/brand/social/avatar-512.png",
    previewAlt: "Avatar, 512 pixels square",
    fit: "icon",
    surface: "dark",
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
    fit: "favicon",
    surface: "dark",
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
    fit: "icon",
    surface: "dark",
    caption: "Touch icon 180",
    downloads: [{ href: "/brand/favicon/apple-touch-icon.png", label: "PNG" }],
  },
];

const BANNER_TILES: BrandTile[] = [
  {
    preview: "/brand/social/og-card-1200x630.png",
    previewAlt: "Link preview card, 1200 by 630",
    surface: "dark",
    caption: "Link preview (OG) 1200×630",
    downloads: [{ href: "/brand/social/og-card-1200x630.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-x-1500x500.png",
    previewAlt: "X header, 1500 by 500",
    surface: "dark",
    caption: "X / Twitter header 1500×500",
    downloads: [{ href: "/brand/social/banner-x-1500x500.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-discord-1920x1080.png",
    previewAlt: "Discord invite splash, 1920 by 1080",
    surface: "dark",
    caption: "Discord invite splash 1920×1080",
    downloads: [
      { href: "/brand/social/banner-discord-1920x1080.png", label: "PNG" },
      { href: "/brand/social/banner-discord-server-960x540.png", label: "server 960×540" },
    ],
  },
  {
    preview: "/brand/social/banner-youtube-2560x1440.png",
    previewAlt: "YouTube banner, 2560 by 1440",
    surface: "dark",
    caption: "YouTube banner 2560×1440",
    downloads: [{ href: "/brand/social/banner-youtube-2560x1440.png", label: "PNG" }],
  },
  {
    preview: "/brand/social/banner-tiktok-1080x1920.png",
    previewAlt: "TikTok vertical card, 1080 by 1920",
    fit: "tall",
    surface: "dark",
    caption: "TikTok vertical 1080×1920",
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

function BrandTiles({ tiles, className }: { tiles: BrandTile[]; className?: string }) {
  return (
    <ul className={cx(styles.grid, className)}>
      {tiles.map((tile) => (
        <li key={tile.caption} className={styles.cell}>
          <figure className={styles.tile}>
            <div className={cx(styles.preview, styles[tile.surface], tile.fit && styles[tile.fit])}>
              {/*
                Brand assets are shown exactly as authored, so these are plain
                <img> elements: routing them through the image optimizer would
                re-encode the very files people are here to download and compare.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tile.preview} alt={tile.previewAlt} loading="lazy" decoding="async" />
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.captionText}>
                {tile.caption}
                {tile.note ? <span className={styles.note}>{tile.note}</span> : null}
              </span>
              <span className={styles.files}>
                {tile.downloads.map((file) => (
                  <a
                    key={file.href + file.label}
                    href={file.href}
                    download
                    className={styles.file}
                    aria-label={`Download ${tile.caption}, ${file.label}`}
                  >
                    <Icon glyph={download02} />
                    {file.label}
                  </a>
                ))}
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

export default function BrandPage() {
  return (
    <Page tone="yellow">
      <PageHero
        eyebrow="Brand kit"
        title={["The OPEN//77", "mark."]}
        accent={[1]}
        watermark="//77"
        size="compact"
        className={styles.hero}
        lead={
          <>
            Painted lockup (PNG), the <strong>{"//77"}</strong> mark and <strong>77</strong> monogram cut from it, favicons,
            avatars and social banners, everything in one download, plus individual files below.
          </>
        }
        actions={
          <CtaLink href="/brand/open77-brand-kit.zip" download icon={download02} meta="Logo · mark · favicons · avatars · banners" lines size="lg">
            Download full kit (.zip)
          </CtaLink>
        }
        aside={
          <div className={styles.heroMark}>
            {/* eslint-disable-next-line @next/next/no-img-element -- shown exactly as authored */}
            <img src="/brand/logo/open77-logo-dark-2000.png" alt="The OPEN//77 painted lockup" width={2000} height={303} />
          </div>
        }
      />

      <Section id="logo" eyebrow="Logo" title="Wordmark & mark." className={styles.first}>
        <BrandTiles tiles={LOGO_TILES} className={styles.logoGrid} />
      </Section>

      <Section id="profile" eyebrow="Avatars & favicons" title="Profile marks.">
        <BrandTiles tiles={PROFILE_TILES} className={styles.profileGrid} />
      </Section>

      <Section id="banners" eyebrow="Banners" title="Social headers.">
        <BrandTiles tiles={BANNER_TILES} className={styles.bannerGrid} />
      </Section>

      <Section
        id="colours"
        eyebrow="Colours"
        title="Palette."
        lead={
          <>
            The painted lockup uses one cyan. Product UI splits the same <strong>{"//"}</strong> into Ice and Electric.
          </>
        }
      >
        <ul className={styles.palette}>
          {PALETTE.map((colour) => (
            <li key={colour.hex} className={styles.swatch}>
              <span className={styles.chip} style={{ "--swatch": colour.hex } as CSSProperties} aria-hidden="true" />
              <span className={styles.swatchName}>{colour.name}</span>
              <CopyButton text={colour.hex} label={colour.hex} className={styles.swatchCopy} />
            </li>
          ))}
        </ul>
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Brand Kit", path: "/brand" },
          ]),
        )}
      />
    </Page>
  );
}
