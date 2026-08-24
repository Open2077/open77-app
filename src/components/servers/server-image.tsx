"use client";

import { useState } from "react";

import { isConformantBanner, isConformantIcon } from "@/lib/server-images";

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
 * `src` is expected to be stable for the lifetime of the element (callers key by
 * server id / navigate to remount), so no reset effect is needed.
 */
export function ServerImage({
  src,
  kind,
  alt = "",
  className,
  label,
}: {
  src: string | null | undefined;
  kind: Kind;
  /** Empty by default: these images are decorative next to a visible name. */
  alt?: string;
  className?: string;
  /** Short text drawn in the placeholder (e.g. a server initial). */
  label?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const conformant = kind === "icon" ? isConformantIcon : isConformantBanner;

  return (
    <span className={`svimg svimg-${kind}${loaded ? " is-loaded" : ""}${className ? ` ${className}` : ""}`}>
      <span className="svimg-fallback" aria-hidden="true">
        {label ? <span className="svimg-initial">{label}</span> : null}
      </span>
      {src ? (
        // Server-provided cross-origin URL; the app uses plain <img> for all
        // remote/brand imagery, and the conformance guard is what makes it safe.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="svimg-img"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            setLoaded(conformant(img.naturalWidth, img.naturalHeight));
          }}
          onError={() => setLoaded(false)}
        />
      ) : null}
    </span>
  );
}
