"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { MASTER_URL } from "@/lib/account/api";
import { validatePlayerHistory, type PlayerHistory } from "@/lib/server-history-data";

type Snapshot = { data?: PlayerHistory; error?: string; loading: boolean; checkedAt: number };
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
      if (Date.now() < cooldownUntil) throw new Error("Activity is busy. Retrying shortly.");
      const response = await fetch(`${MASTER_URL}/api/v1/servers/${encodeURIComponent(id)}/player-history?hours=${hours}`, { signal: AbortSignal.timeout(30_000), headers: { Accept: "application/json" } });
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const seconds = Number(retry);
        cooldownUntil = Math.max(Date.now() + 60_000, retry && Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retry ?? "") || 0);
        throw new Error("Activity is busy. Retrying shortly.");
      }
      if (response.status === 404) {
        publish(key, { loading: false, checkedAt: Date.now(), error: "No public activity history is available yet." });
        return;
      }
      if (!response.ok) throw new Error("Activity is temporarily unavailable.");
      const data = validatePlayerHistory(await response.json(), id, hours);
      publish(key, { data, loading: false, checkedAt: Date.now() });
    } catch (error) {
      publish(key, { data: current.data, loading: false, checkedAt: Date.now(), error: error instanceof Error && error.name === "Error" ? error.message : "Activity is temporarily unavailable." });
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
