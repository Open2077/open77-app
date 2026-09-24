"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { CommunityContent, CommunityMedia } from "@/lib/community/types";
import styles from "./media-lightbox.module.css";

type Derivative = CommunityMedia["derivatives"][number];
export type GalleryImage = { reference: NonNullable<CommunityContent["media"]>[number]; gallery?: Derivative; full?: Derivative };

export function MediaLightbox({ images }: { images: GalleryImage[] }) {
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
    <section className="hub-media-gallery" aria-label="Project screenshots">{images.map(({ reference, gallery, full }, index) => <figure key={reference.mediaId}>
      {gallery ? <a href={full?.url ?? gallery.url} target="_blank" rel="noopener noreferrer" aria-label={`Open screenshot: ${reference.altText}`} aria-haspopup="dialog"
        onClick={event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog.current?.showModal) return;
          event.preventDefault(); trigger.current = event.currentTarget; setSelected(index); setFailed(false);
          dialog.current.showModal(); closeButton.current?.focus();
        }}>
        <Image unoptimized src={gallery.url} width={gallery.width} height={gallery.height} alt={reference.altText}
          loading={index === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
      </a> : <div className="hub-media-unavailable">Screenshot temporarily unavailable</div>}
      {reference.caption && <figcaption>{reference.caption}</figcaption>}
    </figure>)}</section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => { setSelected(null); trigger.current?.focus(); }}
      onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }}>
      <header className={styles.header}><h2 id={titleId}>Screenshot {position + 1} of {available.length}</h2><button ref={closeButton} type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>Close screenshot</button></header>
      {current && full && <>{failed ? <p className="hub-notice" role="alert">This screenshot could not be loaded. Try its full image link below.</p> :
        <Image key={full.url} unoptimized className={styles.image} src={full.url} width={full.width} height={full.height} alt={current.reference.altText} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
        <p className={styles.caption}>{current.reference.caption || current.reference.altText}</p>
        <nav className={styles.controls} aria-label="Screenshot navigation"><button type="button" className="btn btn-ghost" disabled={position <= 0} onClick={() => move(-1)}>Previous screenshot</button>
          <button type="button" className="btn btn-ghost" disabled={position >= available.length - 1} onClick={() => move(1)}>Next screenshot</button>
          <a href={full.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open full image ↗</a></nav></>}
    </dialog>
  </>;
}
