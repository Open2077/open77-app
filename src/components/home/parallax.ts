"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { DependencyList, RefObject } from "react";

/** Parallax group of the fixed scene backgrounds; parked once the footer shows. */
export const SCENE_BG_GROUP = "scene-bg";

const suspendedGroups = new Set<string>();
const suspendListeners = new Set<() => void>();

/** Parks (or releases) every parallax layer of a group at its rest position. */
export function setParallaxGroupSuspended(group: string, suspended: boolean): void {
  const was = suspendedGroups.has(group);
  if (suspended) suspendedGroups.add(group);
  else suspendedGroups.delete(group);
  if (was !== suspended) suspendListeners.forEach((listener) => listener());
}

export type ParallaxLayer = {
  ref: RefObject<HTMLElement | null>;
  /** Multiplier of the pointer offset; negative values move against the pointer. */
  depth?: number;
  group?: string;
};

const NO_DEPENDENCIES: DependencyList = [];

/** Pointer parallax: each layer eases towards the cursor offset times its depth. */
export function useParallax(layers: ParallaxLayer[], dependencies: DependencyList = NO_DEPENDENCIES) {
  useGSAP(
    () => {
      const nodes = layers.flatMap((layer) => {
        const node = layer.ref.current;
        return node ? [{ node, depth: layer.depth ?? 1, group: layer.group }] : [];
      });
      if (nodes.length !== layers.length) return;
      const mm = gsap.matchMedia();
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const ease = { duration: 1, ease: "sine.out" };
        const movers = nodes.map((layer) => ({
          depth: layer.depth,
          group: layer.group,
          xTo: gsap.quickTo(layer.node, "x", ease),
          yTo: gsap.quickTo(layer.node, "y", ease),
        }));
        const parkSuspended = () => {
          movers.forEach((mover) => {
            if (mover.group && suspendedGroups.has(mover.group)) {
              mover.xTo(0);
              mover.yTo(0);
            }
          });
        };
        parkSuspended();
        suspendListeners.add(parkSuspended);

        const reset = () => {
          movers.forEach((mover) => {
            mover.xTo(0);
            mover.yTo(0);
          });
        };
        const onMove = (event: MouseEvent) => {
          const x = (event.clientX / window.innerWidth - 0.5) * 40;
          const y = (event.clientY / window.innerHeight - 0.5) * 24;
          movers.forEach((mover) => {
            if (mover.group && suspendedGroups.has(mover.group)) return;
            mover.xTo(x * mover.depth);
            mover.yTo(y * mover.depth);
          });
        };
        const root = document.documentElement;
        window.addEventListener("mousemove", onMove);
        root.addEventListener("mouseleave", reset);
        return () => {
          suspendListeners.delete(parkSuspended);
          window.removeEventListener("mousemove", onMove);
          root.removeEventListener("mouseleave", reset);
        };
      });
      return () => mm.revert();
    },
    { dependencies: [...dependencies] },
  );
}
