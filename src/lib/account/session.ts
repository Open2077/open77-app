"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "open77.session";

/**
 * The signed-in state, persisted locally.
 *
 * Same architecture as `components/favorites.ts`: local storage is an external
 * store read through `useSyncExternalStore`, so the prerendered HTML shows the
 * signed-out state and hydration promotes it without tearing. When storage is
 * unavailable (private mode, policy) the in-memory snapshot still carries the
 * session for the lifetime of the tab — signing in must not depend on
 * persistence working.
 *
 * What is stored is the opaque session token plus the profile facts the UI
 * needs before `/me` answers. The token is a revocable, expiring credential —
 * the master invalidates it on logout and after `expiresAtUtc`.
 */
export type StoredSession = {
  token: string;
  expiresAtUtc: string;
  accountId: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
  email?: string;
};

type Snapshot = {
  session: StoredSession | null;
  /** False until storage has been consulted; callers must not render "signed out" as fact before then. */
  ready: boolean;
};

const EMPTY: Snapshot = { session: null, ready: false };

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function isExpired(session: StoredSession): boolean {
  const expires = Date.parse(session.expiresAtUtc);
  return Number.isFinite(expires) && expires <= Date.now();
}

function readStorage(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const session = parsed as StoredSession;
    if (typeof session.token !== "string" || session.token.length === 0) return null;
    if (isExpired(session)) return null;
    return session;
  } catch {
    // Storage unavailable: fall back to whatever the in-memory snapshot holds.
    return snapshot.session;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function refresh() {
  snapshot = { session: readStorage(), ready: true };
  notify();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) refresh();
}

function subscribe(listener: () => void) {
  if (!snapshot.ready) {
    snapshot = { session: readStorage(), ready: true };
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

function write(session: StoredSession | null) {
  try {
    if (session === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Persistence is best-effort; the in-memory snapshot below is authoritative
    // for this tab either way.
  }
  snapshot = { session, ready: true };
  notify();
}

export function useSession() {
  const { session, ready } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const start = useCallback((next: StoredSession) => write(next), []);
  const clear = useCallback(() => write(null), []);
  const update = useCallback((patch: Partial<StoredSession>) => {
    if (snapshot.session) write({ ...snapshot.session, ...patch });
  }, []);

  return { session, ready, start, clear, update };
}
