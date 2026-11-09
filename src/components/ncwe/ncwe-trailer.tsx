"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { play } from "@/components/ui/icons";

import styles from "./ncwe-trailer.module.css";

const PLAYER = "https://www.youtube-nocookie.com";

function embed(id: string, parameters: Record<string, string>): string {
  return `${PLAYER}/embed/${id}?${new URLSearchParams(parameters).toString()}`;
}

/**
 * The trailer with sound, in a dialog, opened by a button: the hero's
 * "Watch the trailer", or the poster lower on the page. The player only exists
 * while the dialog is open, so closing it stops the sound.
 */
export type TrailerLabels = { watch: string; watchLength: string; eyebrow: string };

const ENGLISH: TrailerLabels = { watch: "Watch the trailer", watchLength: "Watch the trailer ({length})", eyebrow: "Trailer · {length}" };

function Trailer({
  videoId,
  title,
  length,
  poster,
  labels = ENGLISH,
}: {
  videoId: string;
  title: string;
  length: string;
  poster?: string;
  labels?: TrailerLabels;
}) {
  const withLength = (text: string) => text.replace("{length}", length);
  const dialog = useRef<DialogHandle>(null);
  const [open, setOpen] = useState(false);
  const show = () => {
    setOpen(true);
    dialog.current?.open();
  };
  return (
    <>
      {poster ? (
        <button type="button" className={styles.reel} onClick={show}>
          <Image src={poster} alt="" fill sizes="(max-width: 1100px) 100vw, 1100px" quality={75} />
          <span className={styles.reelPlay} aria-hidden="true">
            <Icon glyph={play} />
          </span>
          <span className={styles.reelLabel}>
            <span className={styles.reelTitle}>{labels.watch}</span>
            <span className={styles.reelLength}>{length}</span>
          </span>
        </button>
      ) : (
        <span className={styles.trigger}>
          <Button color="blue" border lines="none" icon={play} iconPosition="left" onClick={show} aria-label={withLength(labels.watchLength)}>
            {labels.watch}
          </Button>
        </span>
      )}
      <Dialog ref={dialog} title={title} eyebrow={withLength(labels.eyebrow)} size="lg" onClose={() => setOpen(false)}>
        <div className={styles.screen}>
          {open ? (
            <iframe
              src={embed(videoId, { autoplay: "1", rel: "0", modestbranding: "1", playsinline: "1" })}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

/** "Watch the trailer": the secondary action of the hero. */
export function NcweTrailerButton({
  videoId,
  title,
  length,
  labels,
}: {
  videoId: string;
  title: string;
  length: string;
  labels?: TrailerLabels;
}) {
  return <Trailer videoId={videoId} title={title} length={length} labels={labels} />;
}

/** The trailer's poster as a large play button (the "see it move" band lower on the page). */
export function NcweTrailerPoster({
  videoId,
  title,
  poster,
  length,
  labels,
}: {
  videoId: string;
  title: string;
  poster: string;
  length: string;
  labels?: TrailerLabels;
}) {
  return <Trailer videoId={videoId} title={title} length={length} poster={poster} labels={labels} />;
}
