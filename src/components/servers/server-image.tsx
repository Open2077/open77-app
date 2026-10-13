"use client";

import { useCallback, useState, type ReactNode } from "react";

import { isConformantBanner, isConformantIcon } from "@/lib/server-images";

import styles from "./server-image.module.css";

type Kind = "icon" | "banner";

/**
 * A server-supplied image with a client-side conformance guard.
 *
 * The image is rendered on top of a themed gradient placeholder but stays
 * invisible until it has (a) actually decoded and (b) passed the dimension/aspect
 * check for its {@link Kind} (see `lib/server-images`). A load error or a
 * non-conformant size simply leaves the placeholder showing — the guard makes it
 * impossible to flash a broken or distorted image, even if the master ever hands
 * us a bad URL.
 *
 * Static pages can finish loading images before React attaches its handlers.
 * Check already-complete images when the ref attaches, as well as on load.
 * Validation belongs to a specific source so refreshed URLs cannot inherit it.
 */
export function ServerImage({
  src,
  kind,
  alt = "",
  className,
  label,
  fallback,
}: {
  src: string | null | undefined;
  kind: Kind;
  /** Empty by default: these images are decorative next to a visible name. */
  alt?: string;
  className?: string;
  /** Short text drawn in the placeholder (e.g. a server initial). */
  label?: string;
  /** Richer placeholder artwork; takes precedence over `label`. */
  fallback?: ReactNode;
}) {
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const conformant = kind === "icon" ? isConformantIcon : isConformantBanner;
  const validate = useCallback((img: HTMLImageElement | null) => {
    if (!img?.complete) return;
    setLoadedSource(conformant(img.naturalWidth, img.naturalHeight) ? src ?? null : null);
  }, [src, conformant]);
  const loaded = Boolean(src) && loadedSource === src;

  return (
    <span
      className={[styles.image, styles[kind], loaded ? styles.loaded : "", className ?? ""].filter(Boolean).join(" ")}
      data-server-image={kind}
      data-loaded={loaded || undefined}
    >
      <span className={styles.fallback} aria-hidden="true">
        {fallback ?? (label ? <span className={styles.initial}>{label}</span> : null)}
      </span>
      {src ? (
        // Server-provided cross-origin URL; the app uses plain <img> for all
        // remote/brand imagery, and the conformance guard is what makes it safe.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={validate}
          className={styles.img}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={(event) => validate(event.currentTarget)}
          onError={() => setLoadedSource(null)}
        />
      ) : null}
    </span>
  );
}
