"use client";

import { useEffect, useState } from "react";
import { communityMarkdown } from "@/lib/community/markdown";
import type { CommunityContent } from "@/lib/community/types";
import { PrivateMediaPreview } from "./private-media-preview";
import { ExternalVideos } from "./external-videos";

export function DraftPreview({ content, token }: { content: CommunityContent; token: string }) {
  const [rendered, setRendered] = useState<{ source: CommunityContent; html: string[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([content.description, content.installation, content.license ?? ""].map(communityMarkdown))
      .then(html => { if (!cancelled) { setRendered({ source: content, html }); setError(""); } })
      .catch(() => { if (!cancelled) setError("Preview could not be rendered. Your draft text is unchanged."); });
    return () => { cancelled = true; };
  }, [content]);
  return <article className="hub-section" aria-label="Private project preview"><p className="hub-kicker">PRIVATE DRAFT PREVIEW</p>
    <h2>{content.title || "Untitled creation"}</h2><p>{content.summary}</p>
    {content.clipMediaId && <div className="hub-media-editor"><figure><PrivateMediaPreview token={token} mediaId={content.clipMediaId} alt="Hover clip" variant="clip" /><figcaption>Hover clip</figcaption></figure></div>}
    <div className="hub-media-editor">{content.media?.map(item => <figure key={item.mediaId}><PrivateMediaPreview token={token} mediaId={item.mediaId} alt={item.altText} />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div>
    {error ? <p role="alert">{error}</p> : rendered?.source !== content ? <p role="status">Rendering preview…</p> : <>
      <section><h3>Overview</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[0] ?? "" }} /></section>
      {content.installation && <section><h3>Installation</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[1] ?? "" }} /></section>}
      {content.license && <section><h3>License</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[2] ?? "" }} /></section>}
    </>}
    <ExternalVideos urls={content.videoUrls ?? []} />
  </article>;
}

