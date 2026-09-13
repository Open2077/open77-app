"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { previewMedia } from "@/lib/community/client-api";
import type { CommunityMedia } from "@/lib/community/types";

type Derivative = CommunityMedia["derivatives"][number];

/** A creator's private look at processed media through a short-lived grant: a card image, or the clip with its poster. */
export function PrivateMediaPreview({ token, mediaId, alt, variant = "card" }: { token: string; mediaId: string; alt: string; variant?: "card" | "clip" }) {
  const [media, setMedia] = useState<{ main: Derivative; poster: Derivative | null } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    previewMedia(token, mediaId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(result => { if (!controller.signal.aborted) {
        const main = result.derivatives.find(item => item.name === variant);
        setMedia(main ? { main, poster: result.derivatives.find(item => item.name === "poster") ?? null } : null);
        setError(main ? "" : "This preview is not available. Refresh to try again.");
      } })
      .catch(() => { if (!controller.signal.aborted) setError("Preview unavailable. Your access or preview link may have expired."); });
    return () => controller.abort();
  }, [token, mediaId, attempt, variant]);
  return <div className="hub-private-preview">{error ? <div><p role="status">{error}</p><button type="button" className="btn btn-ghost" onClick={() => setAttempt(value => value + 1)}>Refresh preview</button></div> :
    media ? variant === "clip" ? <video src={media.main.url} poster={media.poster?.url} controls muted loop playsInline preload="metadata" aria-label={alt} onError={() => setError("This clip could not be loaded.")} /> :
      <Image unoptimized src={media.main.url} width={media.main.width} height={media.main.height} alt={alt} referrerPolicy="no-referrer" onError={() => setError("This preview could not be loaded.")} /> :
      <p role="status">Preparing private preview…</p>}</div>;
}
