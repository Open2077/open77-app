"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowLeft01, arrowRight01, cancel01, maximize01 } from "@/components/ui/icons";
import type { CommunityContent, CommunityMedia } from "@/lib/community/types";

import styles from "./media-lightbox.module.css";

type Derivative = CommunityMedia["derivatives"][number];
export type GalleryImage = { reference: NonNullable<CommunityContent["media"]>[number]; gallery?: Derivative; full?: Derivative };

/**
 * Screenshots as a grid of framed thumbnails that open in a modal viewer
 * (arrow keys step through). Modifier-clicks keep the plain link to the full
 * image. `lead` draws the first screenshot across the whole row.
 */
export function MediaLightbox({ images, lead = false }: { images: GalleryImage[]; lead?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), closeButton = useRef<HTMLButtonElement>(null), trigger = useRef<HTMLAnchorElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null), [failed, setFailed] = useState(false);
  const titleId = useId();
  const available = images.flatMap((image, index) => image.gallery ? [index] : []);
  const position = selected === null ? -1 : available.indexOf(selected);
  const current = selected === null ? null : images[selected];
  const full = current?.full ?? current?.gallery;
  function move(delta: number) {
    const next = available[position + delta];
    if (next !== undefined) { setSelected(next); setFailed(false); }
  }
  return <>
    <section className={cx(styles.gallery, lead && styles.lead)} aria-label="Project screenshots" data-media-gallery>
      {images.map(({ reference, gallery, full }, index) => (
        <figure key={reference.mediaId} className={styles.figure}>
          {gallery ? (
            <a
              className={styles.shot}
              href={full?.url ?? gallery.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open screenshot: ${reference.altText}`}
              aria-haspopup="dialog"
              onClick={event => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog.current?.showModal) return;
                event.preventDefault(); trigger.current = event.currentTarget; setSelected(index); setFailed(false);
                dialog.current.showModal(); closeButton.current?.focus();
              }}
            >
              <Image unoptimized src={gallery.url} width={gallery.width} height={gallery.height} alt={reference.altText}
                loading={index === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
              <span className={styles.zoom} aria-hidden="true"><Icon glyph={maximize01} /></span>
            </a>
          ) : <div className={styles.unavailable}>Screenshot temporarily unavailable</div>}
          {reference.caption ? <figcaption className={styles.caption}>{reference.caption}</figcaption> : null}
        </figure>
      ))}
    </section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => { setSelected(null); trigger.current?.focus(); }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>Screenshot {position + 1} of {available.length}</h2>
          <button ref={closeButton} type="button" className={styles.close} aria-label="Close screenshot" onClick={() => dialog.current?.close()}>
            <span className={styles.closeLabel} aria-hidden="true">Close</span>
            <Icon glyph={cancel01} />
          </button>
        </header>
        {current && full ? <>
          <div className={styles.viewport}>
            {failed ? (
              <Notice kind="danger" className={styles.failed}>This screenshot could not be loaded. Try its full image link below.</Notice>
            ) : (
              <Image key={full.url} unoptimized className={styles.image} src={full.url} width={full.width} height={full.height} alt={current.reference.altText} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
            )}
          </div>
          <p className={styles.lightboxCaption}>{current.reference.caption || current.reference.altText}</p>
          <nav className={styles.controls} aria-label="Screenshot navigation">
            <Button color="neutral" border lines="none" size="sm" icon={arrowLeft01} iconPosition="left" disabled={position <= 0} onClick={() => move(-1)}>
              Previous screenshot
            </Button>
            <Button color="neutral" border lines="none" size="sm" icon={arrowRight01} disabled={position >= available.length - 1} onClick={() => move(1)}>
              Next screenshot
            </Button>
            <a className={styles.full} href={full.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open full image ↗</a>
          </nav>
        </> : null}
      </div>
    </dialog>
  </>;
}
