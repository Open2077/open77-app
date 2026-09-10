"use client";

import { useCallback, useEffect, useState } from "react";

import { InfoIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { useAdminActivity } from "./admin-activity";

/**
 * Load-on-mount state for one admin dataset: data, error strip, reload. A 401
 * clears the stored session (the gate then takes over); every other failure
 * renders as an inline error with the master's message. Loading is derived
 * (nothing fetched, nothing failed) so the effect only touches state from the
 * async continuation.
 */
export function useAdminData<T>(load: (token: string) => Promise<T>) {
  const { session, clear } = useSession();
  const token = session?.token ?? null;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [settled, setSettled] = useState<{ load: typeof load; token: string; generation: number } | null>(null);
  const { begin } = useAdminActivity();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let success = false;
    const finish = begin();
    load(token)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
        success = true;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
      })
      .finally(() => {
        if (!cancelled) { setRefreshing(false); setSettled({ load, token, generation }); }
        finish(cancelled ? undefined : success);
      });
    return () => {
      cancelled = true;
      finish();
    };
  }, [token, load, clear, generation, begin]);

  /** Refetch; called from event handlers only. */
  const reload = useCallback(() => {
    setRefreshing(true);
    setGeneration((value) => value + 1);
  }, []);

  const loading = token !== null && (refreshing || settled?.load !== load || settled?.token !== token || settled?.generation !== generation);

  useEffect(() => {
    window.addEventListener("open77:admin-refresh", reload);
    return () => window.removeEventListener("open77:admin-refresh", reload);
  }, [reload]);

  return { token, data, setData, error, setError, loading, reload };
}

export function ErrorStrip({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="ac-error" role="alert" style={{ marginBottom: 12 }}>
      <InfoIcon />
      {message}
    </p>
  );
}
