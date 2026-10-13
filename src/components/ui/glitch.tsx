"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "./device";

import styles from "./glitch.module.css";

const GLITCH_CHARS = "!<>-_\\/[]{}=+*^?#";

function scramble(text: string, chars: string, buffer: string[]): string {
  for (let index = 0; index < text.length; index++) {
    const original = text[index] ?? "";
    const swap = Math.random() < 0.3;
    const replacement = chars[(Math.random() * chars.length) | 0];
    buffer[index] = swap && replacement ? replacement : original;
  }
  buffer.length = text.length;
  return buffer.join("");
}

/**
 * Hover text scramble. The visible glyphs are drawn from `data-glitchess` by a
 * pseudo-element; hovering the nearest link or button rewrites that attribute
 * a few times with random characters before settling back on the label.
 */
export function Glitch({
  children,
  glitchChars = GLITCH_CHARS,
  duration = 0.1,
  repeat = 3,
  className,
}: {
  children: ReactNode;
  glitchChars?: string;
  duration?: number;
  repeat?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const text =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : Array.isArray(children)
        ? children.join("")
        : "";

  useEffect(() => {
    const node = ref.current;
    const host = node ? (node.closest("button, a") ?? node.parentElement) : null;
    if (!host || !node || !text || prefersReducedMotion()) return;
    // Start from the current label. A scramble interrupted by a label change
    // must not survive it, and the cleanup below must not write the old label
    // back over the new one (React updates the attribute before cleanups run).
    node.dataset.glitchess = text;
    const buffer: string[] = [];
    let timer = 0;
    const restore = () => {
      node.dataset.glitchess = text;
    };
    const play = () => {
      window.clearTimeout(timer);
      let step = 0;
      const steps = repeat + 1;
      const interval = duration * 1000;
      const next = () => {
        if (step >= steps) {
          restore();
          return;
        }
        node.dataset.glitchess = scramble(text, glitchChars, buffer);
        step += 1;
        timer = window.setTimeout(next, interval);
      };
      next();
    };
    host.addEventListener("mouseenter", play);
    return () => {
      window.clearTimeout(timer);
      host.removeEventListener("mouseenter", play);
    };
  }, [duration, glitchChars, text, repeat]);

  return (
    <span ref={ref} data-glitchess={text} className={className ? `${styles.glitch} ${className}` : styles.glitch}>
      <span>{children}</span>
    </span>
  );
}
