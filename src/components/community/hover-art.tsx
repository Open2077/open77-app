"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useHoverPreview } from "./use-hover-media";

/**
 * The picture area of a card: the cover by default, the hover clip or the next
 * screenshots while the pointer rests on it. Server components pass the cover
 * they already resolved so the first paint needs no request.
 */
export function HoverArt({ cover, media, clipMediaId, fallback, className, children }: {
  cover: { url: string; width: number; height: number } | null;
  media: { mediaId: string }[] | null | undefined;
  clipMediaId?: string | null;
  fallback: ReactNode;
  className: string;
  children?: ReactNode;
}) {
  const [hovering, setHovering] = useState(false);
  const preview = useHoverPreview(media, clipMediaId, hovering);
  return <span className={className} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
    {preview?.kind === "video" ? <video src={preview.src} poster={preview.poster ?? cover?.url ?? undefined} muted autoPlay loop playsInline preload="none" aria-hidden="true" /> :
      preview?.kind === "image" ? <Image unoptimized src={preview.src} width={640} height={360} alt="" referrerPolicy="no-referrer" /> :
      cover ? <Image unoptimized src={cover.url} width={cover.width} height={cover.height} alt="" loading="eager" referrerPolicy="no-referrer" /> : fallback}
    {children}
  </span>;
}
