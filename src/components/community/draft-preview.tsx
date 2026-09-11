"use client";

import { useEffect, useState } from "react";
import { communityMarkdown } from "@/lib/community/markdown";
import type { CommunityContent } from "@/lib/community/types";
import { PrivateMediaPreview } from "./private-media-preview";

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
    <div className="hub-media-editor">{content.media?.map(item => <figure key={item.mediaId}><PrivateMediaPreview token={token} mediaId={item.mediaId} alt={item.altText} />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div>
    {error ? <p role="alert">{error}</p> : rendered?.source !== content ? <p role="status">Rendering preview…</p> : <>
      <section><h3>Overview</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[0] ?? "" }} /></section>
      {content.installation && <section><h3>Installation</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[1] ?? "" }} /></section>}
      {content.license && <section><h3>License</h3><div className="hub-prose" dangerouslySetInnerHTML={{ __html: rendered.html[2] ?? "" }} /></section>}
    </>}
    {content.videoUrls?.map((url, index) => { let valid = false;
      try { const parsed = new URL(url); valid = parsed.protocol === "https:" && !parsed.username && !parsed.password && ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com"].includes(parsed.hostname); } catch { /* Unsent text can contain an incomplete URL. */ }
      return <p key={index}>{valid ? <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc">Watch video ↗</a> : "Complete this video link before publishing."}</p>;
    })}
  </article>;
}

