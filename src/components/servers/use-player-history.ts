"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { MASTER_URL } from "@/lib/account/api";
import { validatePlayerHistory, type PlayerHistory } from "@/lib/server-history-data";

/**
 * Why the last read failed. A code, not a sentence: the cache is shared by every
 * component on the page, and each one words it in the page language.
 */
export type HistoryError = "busy" | "missing" | "unavailable" | "invalid";
class HistoryFailure extends Error {
  readonly code: HistoryError;
  constructor(code: HistoryError) { super(code); this.code = code; }
}
type Snapshot = { data?: PlayerHistory; error?: HistoryError; loading: boolean; checkedAt: number };
const EMPTY: Snapshot = { loading: false, checkedAt: 0 };
const cache = new Map<string, Snapshot>();
const listeners = new Map<string, Set<() => void>>();
const pending = new Set<string>();
const queue: Array<() => Promise<void>> = [];
let active = 0, cooldownUntil = 0;
function publish(key: string, snapshot: Snapshot) {
  cache.set(key, snapshot);
  listeners.get(key)?.forEach(listener => listener());
  if (cache.size > 128) {
    for (const old of cache.keys()) {
      if (!listeners.get(old)?.size && !pending.has(old)) cache.delete(old);
      if (cache.size <= 128) break;
    }
  }
}
function pump() {
  while (active < 2 && queue.length) {
    const job = queue.shift()!;
    active++;
    void job().finally(() => { active--; pump(); });
  }
}
function request(id: string, hours: 24 | 48) {
  const key = `${id}:${hours}`, current = cache.get(key) ?? EMPTY;
  if (pending.has(key) || Date.now() - current.checkedAt < 60_000) return;
  pending.add(key);
  publish(key, { ...current, loading: true });
  queue.push(async () => {
    // Peaks below the viewport can leave the queue before they cost a request.
    if (!listeners.get(key)?.size) { pending.delete(key); cache.delete(key); return; }
    try {
      if (Date.now() < cooldownUntil) throw new HistoryFailure("busy");
      const response = await fetch(`${MASTER_URL}/api/v1/servers/${encodeURIComponent(id)}/player-history?hours=${hours}`, { signal: AbortSignal.timeout(30_000), headers: { Accept: "application/json" } });
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const seconds = Number(retry);
        cooldownUntil = Math.max(Date.now() + 60_000, retry && Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retry ?? "") || 0);
        throw new HistoryFailure("busy");
      }
      if (response.status === 404) {
        publish(key, { loading: false, checkedAt: Date.now(), error: "missing" });
        return;
      }
      if (!response.ok) throw new HistoryFailure("unavailable");
      const data = validatePlayerHistory(await response.json(), id, hours);
      publish(key, { data, loading: false, checkedAt: Date.now() });
    } catch (error) {
      // A plain Error can only come from validatePlayerHistory; network, timeout
      // and JSON failures carry their own names and read as unavailable.
      const code: HistoryError = error instanceof HistoryFailure ? error.code : error instanceof Error && error.name === "Error" ? "invalid" : "unavailable";
      publish(key, { data: current.data, loading: false, checkedAt: Date.now(), error: code });
    } finally { pending.delete(key); }
  });
  pump();
}

/** Shared by visible featured peaks and the profile; two requests at a time, 60s cache. */
export function usePlayerHistory(id: string, hours: 24 | 48 = 48, enabled = true) {
  const key = `${id}:${hours}`;
  const subscribe = useCallback((listener: () => void) => {
    if (!enabled) return () => {};
    const set = listeners.get(key) ?? new Set();
    listeners.set(key, set); set.add(listener);
    return () => { set.delete(listener); if (!set.size) listeners.delete(key); };
  }, [key, enabled]);
  const getSnapshot = useCallback(() => enabled ? cache.get(key) ?? EMPTY : EMPTY, [key, enabled]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { if (document.visibilityState === "visible") request(id, hours); };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [id, hours, enabled]);
  return snapshot;
}
