"use client";

import { createContext, useState, type ReactNode } from "react";

import styles from "./background.module.css";

/**
 * The fixed layer the scenes portal their full-screen art into while the track
 * scrolls horizontally, so the art stays put instead of riding the track.
 */
export const BackgroundHostContext = createContext<HTMLDivElement | null>(null);

export function Background({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <BackgroundHostContext.Provider value={host}>
      {children}
      <div className={styles.bg} ref={setHost} data-scene-bg />
    </BackgroundHostContext.Provider>
  );
}
