"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { previewMedia } from "@/lib/community/client-api";
import type { CommunityMedia } from "@/lib/community/types";

export function PrivateMediaPreview({ token, mediaId, alt }: { token: string; mediaId: string; alt: string }) {
  const [image, setImage] = useState<CommunityMedia["derivatives"][number] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    previewMedia(token, mediaId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(result => { if (!controller.signal.aborted) { setImage(result.derivatives.find(item => item.name === "card") ?? null); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) setError("Preview unavailable. Your access or preview link may have expired."); });
    return () => controller.abort();
  }, [token, mediaId, attempt]);
  return <div className="hub-private-preview">{error ? <div><p role="status">{error}</p><button type="button" className="btn btn-ghost" onClick={() => setAttempt(value => value + 1)}>Refresh preview</button></div> :
    image ? <Image unoptimized src={image.url} width={image.width} height={image.height} alt={alt} referrerPolicy="no-referrer" onError={() => setError("This preview could not be loaded.")} /> :
      <p role="status">Preparing private preview…</p>}</div>;
}
