"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { copy01, tick02 } from "@/components/ui/icons";

import styles from "./post.module.css";

/** Reading progress (a hairline at the top of the viewport) and the copy-link action. */
export function PostTools() {
  const progress = useRef<HTMLSpanElement>(null);
  const wrapper = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");
  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-devblog='prose']");
    if (!article) return;
    let frame = 0;
    const measure = () => {
      const rect = article.getBoundingClientRect();
      const header = document.querySelector("nav[aria-label='Main']")?.closest("header")?.getBoundingClientRect().height ?? 94;
      const fraction = Math.min(1, Math.max(0, (header - rect.top) / Math.max(1, rect.height - window.innerHeight + header)));
      if (progress.current) progress.current.style.transform = `scaleX(${fraction})`;
      frame = 0;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(article);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  async function copy() {
    const url = `${window.location.origin}${window.location.pathname}`;
    const hadFocus = !!wrapper.current?.contains(document.activeElement);
    setCopied(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallback("");
      // The button remounts with its new label; keep keyboard focus on it.
      if (hadFocus) requestAnimationFrame(() => wrapper.current?.querySelector("button")?.focus());
    } catch {
      setFallback(url);
    }
  }
  return (
    <>
      <div className={styles.progress} aria-hidden="true" data-devblog="progress">
        <span ref={progress} />
      </div>
      <span data-devblog="copy" className={styles.copy} ref={wrapper}>
        {/* Keyed: the label scramble keeps the first label it rendered. */}
        <Button key={copied ? "copied" : "copy"} color="red" border lines="none" size="sm" icon={copied ? tick02 : copy01} iconPosition="left" onClick={copy}>
          {copied ? "Link copied" : "Copy article link"}
        </Button>
      </span>
      <span className="sr-only" role="status">
        {copied ? "Article link copied to clipboard." : fallback ? "Clipboard unavailable. Copy the link below." : ""}
      </span>
      {fallback ? (
        <label className={styles.fallback} data-devblog="copy-fallback">
          <span>Copy this link</span>
          <input value={fallback} readOnly onFocus={(event) => event.target.select()} />
        </label>
      ) : null}
    </>
  );
}
