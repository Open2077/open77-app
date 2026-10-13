"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";

import styles from "./music-toggle.module.css";

/** Calm cues from the Cyberpunk 2077 score, played in order and looped. */
const FIRST_TRACK = { src: "/audio/v.m4a", title: "V" };
const TRACKS = [
  FIRST_TRACK,
  { src: "/audio/bells-of-laguna-bend.m4a", title: "Bells of Laguna Bend" },
  { src: "/audio/been-good-to-know-ya.m4a", title: "Been Good to Know Ya" },
];
const trackAt = (index: number) => TRACKS[index] ?? FIRST_TRACK;
const STORAGE_KEY = "open77.music";
/** Background level: the files are already mastered quiet (-20 LUFS). */
const VOLUME = 0.4;

/** Four equaliser bars; the stylesheet animates them while music plays. */
const BARS =
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"><path d="M5 19V9"/><path d="M10 19V5"/><path d="M15 19V11"/><path d="M20 19V7"/></g>';

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}
function writePreference(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* optional browser storage */
  }
}

/**
 * Background music, off until the visitor turns it on. The choice is
 * remembered; the header lives in the root layout, so the music carries on
 * across page changes. Nothing is downloaded until it is turned on.
 */
export function MusicToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef(0);
  const fadeRef = useRef(0);

  const fadeTo = useCallback((target: number, ms: number, done?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelAnimationFrame(fadeRef.current);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      // The frame timestamp can precede `start`; keep the ramp inside [0, 1].
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      audio.volume = Math.min(1, Math.max(0, from + (target - from) * t));
      if (t < 1) fadeRef.current = requestAnimationFrame(step);
      else done?.();
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const audio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const element = new Audio(trackAt(trackRef.current).src);
    element.preload = "auto";
    element.volume = 0;
    element.addEventListener("ended", () => {
      trackRef.current = (trackRef.current + 1) % TRACKS.length;
      element.src = trackAt(trackRef.current).src;
      void element.play().catch(() => {});
    });
    element.addEventListener("playing", () => {
      setPlaying(true);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: trackAt(trackRef.current).title,
          artist: "Cyberpunk 2077 original score",
          album: "OPEN//77",
        });
      }
    });
    element.addEventListener("pause", () => setPlaying(false));
    audioRef.current = element;
    return element;
  }, []);

  /** Resolves false when the browser still blocks sound (no interaction yet). */
  const start = useCallback(async () => {
    const element = audio();
    try {
      await element.play();
      fadeTo(VOLUME, 1600);
      return true;
    } catch {
      return false;
    }
  }, [audio, fadeTo]);

  const stop = useCallback(() => {
    fadeTo(0, 600, () => audioRef.current?.pause());
  }, [fadeTo]);

  // A visitor who left the music on hears it again; browsers only allow sound
  // after an interaction, so a blocked start waits for the first click or key.
  useEffect(() => {
    if (!readPreference()) return;
    const resume = () => void start();
    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      resume();
    };
    queueMicrotask(() => setOn(true));
    void start().then((ok) => {
      if (ok) return;
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [start]);

  useEffect(
    () => () => {
      cancelAnimationFrame(fadeRef.current);
      audioRef.current?.pause();
    },
    [],
  );

  const toggle = () => {
    const next = !on;
    setOn(next);
    writePreference(next);
    if (next) void start();
    else stop();
  };

  return (
    <Button
      lines="none"
      icon={BARS}
      iconOnly
      className={cx(className, styles.music, playing && styles.playing)}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn the music off" : "Turn the music on"}
      title={on ? "Music on · Cyberpunk 2077 original score" : "Music off"}
      data-music={playing ? "playing" : on ? "on" : "off"}
    />
  );
}
