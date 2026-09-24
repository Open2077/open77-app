"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

export function PostTools() {
  const progress = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");
  useEffect(() => {
    const article = document.querySelector<HTMLElement>(".blog-prose");
    if (!article) return;
    let frame = 0;
    const measure = () => { const rect = article.getBoundingClientRect(); const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 94; const fraction = Math.min(1, Math.max(0, (header - rect.top) / Math.max(1, rect.height - window.innerHeight + header))); if (progress.current) progress.current.style.transform = `scaleX(${fraction})`; frame = 0; };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule); observer.observe(article);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  async function copy() {
    const url = `${window.location.origin}${window.location.pathname}`;
    setCopied(false);
    try { await navigator.clipboard.writeText(url); setCopied(true); setFallback(""); }
    catch { setFallback(url); }
  }
  return <><div className="blog-reading-progress" aria-hidden="true"><span ref={progress} /></div><button className="blog-button blog-copy" onClick={copy}>{copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}{copied ? "Link copied" : "Copy article link"}</button><span className="blog-sr-only" role="status">{copied ? "Article link copied to clipboard." : fallback ? "Clipboard unavailable. Copy the link below." : ""}</span>{fallback && <label className="blog-copy-fallback">Copy this link<input value={fallback} readOnly onFocus={event => event.target.select()} /></label>}</>;
}
