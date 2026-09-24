"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { publicMedia } from "@/lib/community/client-api";
import type { CommunityMedia } from "@/lib/community/types";

/* One request per media id, shared by every card, tile and inspector on the page. */
const cache = new Map<string, Promise<CommunityMedia | null>>();
export function loadMedia(id: string): Promise<CommunityMedia | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = publicMedia(id, AbortSignal.timeout(10000)).catch(() => null);
    cache.set(id, pending);
  }
  return pending;
}

type Derivative = CommunityMedia["derivatives"][number]["name"];

/** The URL of one derivative, or null until it is known. Never shows a stale value for a different media id. */
export function useDerivative(mediaId: string | null | undefined, name: Derivative): string | null {
  const [loaded, setLoaded] = useState<{ mediaId: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    void loadMedia(mediaId).then(media => { if (!cancelled) setLoaded({ mediaId, url: media?.derivatives.find(item => item.name === name)?.url ?? null }); });
    return () => { cancelled = true; };
  }, [mediaId, name]);
  return mediaId && loaded?.mediaId === mediaId ? loaded.url : null;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export type HoverPreview = { kind: "video"; src: string; poster: string | null } | { kind: "image"; src: string } | null;

/**
 * Nexus-style hover preview. A hover clip plays muted while the pointer rests
 * on the card; without one, the first screenshots take turns. Nothing loads
 * before the first hover, and nothing plays for reduced-motion users.
 */
export function useHoverPreview(media: { mediaId: string }[] | null | undefined, clipMediaId: string | null | undefined, hovering: boolean): HoverPreview {
  const ids = useMemo(() => (media ?? []).slice(0, 5).map(item => item.mediaId), [media]);
  const key = `${clipMediaId ?? ""}|${ids.join(",")}`;
  const [state, setState] = useState<{ key: string; clip: { src: string; poster: string | null } | null; images: string[] } | null>(null);
  const [index, setIndex] = useState(0);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  useEffect(() => {
    if (!hovering || reduced || state?.key === key || (!clipMediaId && !ids.length)) return;
    let cancelled = false;
    void Promise.all([
      clipMediaId ? loadMedia(clipMediaId) : Promise.resolve(null),
      ...ids.map(id => loadMedia(id)),
    ]).then(([clip, ...images]) => {
      if (cancelled) return;
      const source = clip?.derivatives.find(item => item.name === "clip")?.url ?? null;
      setState({ key, clip: source ? { src: source, poster: clip?.derivatives.find(item => item.name === "poster")?.url ?? null } : null,
        images: images.map(item => item?.derivatives.find(entry => entry.name === "card")?.url ?? null).filter((url): url is string => !!url) });
    });
    return () => { cancelled = true; };
  }, [hovering, reduced, key, clipMediaId, ids, state?.key]);
  const ready = state?.key === key ? state : null;
  useEffect(() => {
    if (!hovering || reduced || !ready || ready.clip || ready.images.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => current + 1), 900);
    return () => window.clearInterval(timer);
  }, [hovering, reduced, ready]);
  if (!hovering || reduced || !ready) return null;
  if (ready.clip) return { kind: "video", src: ready.clip.src, poster: ready.clip.poster };
  if (ready.images.length < 2) return null;
  return { kind: "image", src: ready.images[index % ready.images.length]! };
}
