"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "open77.favorites";

type FavoriteMap = Record<string, boolean>;

type Snapshot = {
  favorites: FavoriteMap;
  /**
   * Whether local storage has been consulted. Until it has, callers must not
   * claim a server is *not* favourited — they simply don't know yet.
   */
  ready: boolean;
};

/**
 * Favourited servers, persisted locally.
 *
 * Local storage is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state inside an effect. That
 * matters for correctness as much as for tidiness: the server cannot know what
 * is in this browser, so the prerendered HTML has to show nothing favourited,
 * and this is the hook that is designed to hand React a different value before
 * and after hydration without tearing.
 *
 * Writes go to storage first and then notify, which keeps a second tab and a
 * second component on this page in agreement.
 */

/** The value hydration must agree with: the server knows no favourites. */
const EMPTY: Snapshot = { favorites: {}, ready: false };

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function readStorage(): FavoriteMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as FavoriteMap) : {};
  } catch {
    // Storage can be unavailable in private mode or blocked by policy.
    return {};
  }
}

function refresh() {
  snapshot = { favorites: readStorage(), ready: true };
  for (const listener of listeners) listener();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) refresh();
}

function subscribe(listener: () => void) {
  // React re-reads the snapshot straight after subscribing, so loading here is
  // what promotes the empty hydration value to the stored one.
  if (!snapshot.ready) {
    snapshot = { favorites: readStorage(), ready: true };
  }
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorageEvent);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return EMPTY;
}

export function useFavorites() {
  const { favorites, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback((id: string) => {
    const next = { ...snapshot.favorites };
    if (next[id]) delete next[id];
    else next[id] = true;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Favourites are a convenience; failing to persist must not break the
      // page, and the in-memory snapshot below still reflects the click.
    }
    snapshot = { favorites: next, ready: true };
    for (const listener of listeners) listener();
  }, []);

  const isFavorite = useCallback((id: string) => Boolean(favorites[id]), [favorites]);

  return { favorites, isFavorite, toggle, ready };
}
