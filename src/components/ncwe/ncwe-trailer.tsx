"use client";

import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { PlayIcon } from "@/components/icons";
import styles from "./ncwe-landing.module.css";

const PLAYER = "https://www.youtube-nocookie.com";

const subscribe = () => () => {};
const noFilm = () => false;
/** Whether this browser should get the moving background at all (read after hydration only). */
function wantsFilm(): boolean {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return !calm && !saver && window.innerWidth >= 760;
}

function embed(id: string, parameters: Record<string, string>): string {
  return `${PLAYER}/embed/${id}?${new URLSearchParams(parameters).toString()}`;
}

/**
 * The hero's moving background: the trailer, muted and looping, behind the
 * poster until it actually plays.
 *
 * The poster is what is rendered on the server and what stays when the video
 * cannot or should not play: reduced motion, data saver, a narrow screen, a
 * player error. The player tells its state over `postMessage` (the protocol of
 * YouTube's own iframe API, spoken directly so no third-party script is
 * loaded); the frame is only shown once it reports that it is playing.
 */
export function NcweHeroBackdrop({ videoId, poster }: { videoId: string; poster: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const wanted = useSyncExternalStore(subscribe, wantsFilm, noFilm);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const origin = wanted ? window.location.origin : "";

  useEffect(() => {
    if (!wanted) return;
    let failed = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== PLAYER || event.source !== frame.current?.contentWindow || typeof event.data !== "string") return;
      let message: { event?: string; info?: { playerState?: number } | number | null };
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.event === "onError") { failed = true; setPlaying(false); return; }
      const state = typeof message.info === "object" && message.info !== null ? message.info.playerState : message.event === "onStateChange" ? message.info : undefined;
      if (state === 1 && !failed) setPlaying(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [wanted]);

  const say = useCallback((payload: object) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify(payload), PLAYER);
  }, []);

  const toggle = () => {
    say({ event: "command", func: paused ? "playVideo" : "pauseVideo", args: [] });
    setPaused(!paused);
  };

  return (
    <div className={styles.backdrop} aria-hidden={!playing || undefined}>
      <Image className={styles.poster} src={poster} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" />
      {wanted && origin ? (
        <iframe
          ref={frame}
          className={styles.film}
          data-playing={playing}
          src={embed(videoId, {
            autoplay: "1", mute: "1", controls: "0", loop: "1", playlist: videoId, playsinline: "1", rel: "0",
            modestbranding: "1", disablekb: "1", fs: "0", iv_load_policy: "3", enablejsapi: "1", origin,
          })}
          title="NCWE trailer, playing silently in the background"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          onLoad={() => say({ event: "listening", id: "ncwe-hero", channel: "widget" })}
        />
      ) : null}
      <div className={styles.shade} />
      {playing ? (
        <button type="button" className={styles.pause} onClick={toggle} aria-pressed={paused}>
          {paused ? "Play background video" : "Pause background video"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Opens the trailer with sound, in a dialog over the page. The player is only
 * created while the dialog is open, so closing it stops the sound.
 */
export function NcweTrailerButton({ videoId, title, className, children }: { videoId: string; title: string; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => { setOpen(true); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={className} onClick={show}>{children}</button>
      <dialog
        ref={dialog}
        className={styles.theater}
        aria-label={title}
        onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === dialog.current) close(); }}
      >
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
        <button type="button" className={styles.theaterClose} onClick={close}>Close</button>
      </dialog>
    </>
  );
}

/** The trailer's poster as a large play button (the "watch it" band lower on the page). */
export function NcweTrailerPoster({ videoId, title, poster, length }: { videoId: string; title: string; poster: string; length: string }) {
  return (
    <NcweTrailerButton videoId={videoId} title={title} className={styles.reel}>
      <Image src={poster} alt="" fill sizes="(max-width: 1100px) 100vw, 1100px" />
      <span className={styles.reelPlay} aria-hidden="true"><PlayIcon size={30} /></span>
      <span className={styles.reelLabel}><b>Watch the trailer</b><i>{length}</i></span>
    </NcweTrailerButton>
  );
}
