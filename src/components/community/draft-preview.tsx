"use client";

import { useEffect, useState } from "react";

import { Notice } from "@/components/ui/feedback";
import { Prose } from "@/components/ui/prose";
import { Display, Eyebrow } from "@/components/ui/typography";
import { communityMarkdown } from "@/lib/community/markdown";
import type { CommunityContent } from "@/lib/community/types";
import { Pending } from "@/components/account/kit";
import { Subhead } from "./creator-parts";
import { ExternalVideos } from "./external-videos";
import { PrivateMediaPreview } from "./private-media-preview";

import styles from "./draft-preview.module.css";

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
  return (
    <article className={styles.preview} aria-label="Private project preview">
      <header className={styles.head}>
        <Eyebrow>Private draft preview</Eyebrow>
        <Display as="h3" size="sm" className={styles.title}>
          {content.title || "Untitled creation"}
        </Display>
        {content.summary ? <p className={styles.summary}>{content.summary}</p> : null}
      </header>
      {content.clipMediaId ? (
        <figure className={styles.clip}>
          <PrivateMediaPreview token={token} mediaId={content.clipMediaId} alt="Hover clip" variant="clip" />
          <figcaption>Hover clip</figcaption>
        </figure>
      ) : null}
      {content.media?.length ? (
        <div className={styles.media}>
          {content.media.map(item => (
            <figure key={item.mediaId}>
              <PrivateMediaPreview token={token} mediaId={item.mediaId} alt={item.altText} />
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : null}
      {error ? (
        <Notice kind="danger">{error}</Notice>
      ) : rendered?.source !== content ? (
        <Pending label="Rendering preview" />
      ) : (
        <>
          <section className={styles.part}>
            <Subhead as="h4">Overview</Subhead>
            <Prose html={rendered.html[0] ?? ""} size="sm" />
          </section>
          {content.installation ? (
            <section className={styles.part}>
              <Subhead as="h4">Installation</Subhead>
              <Prose html={rendered.html[1] ?? ""} size="sm" />
            </section>
          ) : null}
          {content.license ? (
            <section className={styles.part}>
              <Subhead as="h4">License</Subhead>
              <Prose html={rendered.html[2] ?? ""} size="sm" />
            </section>
          ) : null}
        </>
      )}
      <ExternalVideos urls={content.videoUrls ?? []} />
    </article>
  );
}
