"use client";

import { useEffect, useRef } from "react";

import { cx } from "./cx";
import { prefersReducedMotion } from "./device";

import styles from "./video.module.css";

/**
 * Muted background loop from `/home/videos/<id>.mp4`. Plays only while on
 * screen and while the tab is visible; reduced motion leaves the poster.
 */
export function Video({
  id,
  autoPlay = true,
  priority = false,
  className,
}: {
  id: string;
  autoPlay?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = prefersReducedMotion();
    const shouldPlay = autoPlay && !reduced;
    let onScreen = false;
    const sync = () => {
      if (shouldPlay && !document.hidden && onScreen) video.play().catch(() => undefined);
      else video.pause();
    };
    if (reduced) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "20% 0px", threshold: 0 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [autoPlay]);

  return (
    <div className={cx(styles.video, className)}>
      <video
        ref={ref}
        autoPlay={autoPlay}
        preload={priority ? "auto" : "metadata"}
        muted
        loop
        playsInline
        data-ref={id}
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload noplaybackrate noremoteplayback"
        poster={`/home/videos/${id}.webp`}
      >
        <source src={`/home/videos/${id}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}
