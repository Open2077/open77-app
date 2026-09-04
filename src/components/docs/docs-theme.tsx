"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const KEY = "open77.docs.theme";
const EVENT = "open77:docs-theme";
let memoryTheme: "light" | "dark" = "light";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function snapshot() {
  try { return window.localStorage.getItem(KEY) === "dark" ? "dark" : "light"; }
  catch { return memoryTheme; }
}
function serverSnapshot() { return "light"; }
function useDocsTheme() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

export function DocsTheme({ children }: { children: ReactNode }) {
  const theme = useDocsTheme();
  return <div className="docs-site" data-theme={theme}>{children}</div>;
}

export function DocsThemeToggle() {
  const theme = useDocsTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return <button className="docs-theme-toggle" type="button" title={label} aria-label={label} aria-pressed={theme === "dark"}
    onClick={() => {
      memoryTheme = theme === "dark" ? "light" : "dark";
      try { window.localStorage.setItem(KEY, memoryTheme); } catch { /* Keep the choice for this session when storage is blocked. */ }
      window.dispatchEvent(new Event(EVENT));
    }}>
    {theme === "dark" ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 14.3A9 9 0 0 1 9.7 3.5a9 9 0 1 0 10.8 10.8Z" /></svg>}
  </button>;
}
