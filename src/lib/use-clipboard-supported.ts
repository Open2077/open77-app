"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const supported = () => typeof navigator !== "undefined" && !!navigator.clipboard;
const serverSnapshot = () => false;

/** Keep SSR and the first hydration render identical, then expose browser support. */
export function useClipboardSupported() {
  return useSyncExternalStore(subscribe, supported, serverSnapshot);
}
