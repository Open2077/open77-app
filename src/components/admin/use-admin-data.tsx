"use client";

import { useCallback, useEffect, useState } from "react";

import { InfoIcon } from "@/components/icons";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";

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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    load(token)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof MasterApiError && err.status === 401) clear();
        else setError(err instanceof MasterApiError ? err.message : "Request failed. Try again.");
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, load, clear, generation]);

  /** Refetch; called from event handlers only. */
  const reload = useCallback(() => {
    setRefreshing(true);
    setGeneration((value) => value + 1);
  }, []);

  const loading = (data === null && error === null && token !== null) || refreshing;

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
