import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Site wordmark. The official lockup is a painted raster (italic letterforms,
 * speed lines); wrapping that bitmap in an SVG would be a fake vector. Header
 * and footer sit on the light application bar, so this is the navy cut.
 * Intrinsic size matches `scripts/build-brand.mjs` (height 96).
 */
export function Logotype() {
  return (
    // Brand files are shown as authored; the optimizer would re-encode them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="logotype"
      src="/brand/logo/open77-logo-light.png"
      alt=""
      width={723}
      height={96}
      decoding="async"
      aria-hidden="true"
    />
  );
}

export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="OPEN//77 home">
      <Logotype />
    </Link>
  );
}

/**
 * Section label. The `//` is rendered as a styled span rather than literal
 * glyphs so it can be skewed to the brand angle, and it is kept out of the
 * text node that the decode animation rewrites.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <SlashMark /> {children}
    </p>
  );
}

/** Inline variant for headings and captions, where a `<p>` would be invalid. */
export function EyebrowSpan({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow">
      <SlashMark /> {children}
    </span>
  );
}

export function SlashMark() {
  // Braced string, not a bare text node: `//` in JSX children reads as a
  // stray comment to both linters and anyone skimming the file.
  return <span className="eyebrow-slash">{"//"}</span>;
}
