"use client";

import { useSyncExternalStore } from "react";

/**
 * The home page runs in one of two scroll modes.
 *
 * `horizontal` pins the three audience scenes and drives them sideways with the
 * vertical scroll; `vertical` lays them out as ordinary stacked sections. The
 * mode is mirrored on `<html data-scroll>` because most of the layout switch is
 * plain CSS keyed on that attribute.
 */
export type ScrollMode = "vertical" | "horizontal";

/** Wide enough for the desktop parallax and scroll-linked backgrounds. */
export const DESKTOP_QUERY = "(min-width: 1085px)";

/** Where the horizontal track is even attempted; a content-fit check follows. */
export const HORIZONTAL_QUERY =
  "(min-width: 769px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

let mode: ScrollMode = "vertical";
const listeners = new Set<(mode: ScrollMode) => void>();

export function getScrollMode(): ScrollMode {
  return mode;
}

export function isHorizontalScroll(): boolean {
  return mode === "horizontal";
}

/**
 * Share of the viewport height a `[data-fit]` block may take before the page
 * gives up on the horizontal track. Read from `--fit-ratio`.
 */
export function getFitRatio(): number {
  const ratio = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--fit-ratio").trim(),
  );
  return !Number.isFinite(ratio) || ratio <= 0 || ratio > 1 ? 0.9 : ratio;
}

export function setScrollMode(next: ScrollMode): void {
  const root = document.documentElement;
  const changed = mode !== next || root.dataset.scroll !== next;
  mode = next;
  root.dataset.scroll = next;
  if (changed) listeners.forEach((listener) => listener(next));
}

export function subscribeScrollMode(listener: (mode: ScrollMode) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIsVerticalScroll(): boolean {
  return useSyncExternalStore(subscribeScrollMode, getScrollMode, () => "vertical") === "vertical";
}
