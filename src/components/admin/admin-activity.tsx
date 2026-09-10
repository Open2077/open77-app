"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

const Activity = createContext({ pending: 0, updated: null as number | null, failed: false,
  begin: (): ((success?: boolean) => void) => () => {} });

export function AdminActivityProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const [updated, setUpdated] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const begin = useCallback(() => {
    setPending(n => n + 1);
    let ended = false;
    return (success?: boolean) => {
      if (ended) return;
      ended = true;
      setPending(n => Math.max(0, n - 1));
      if (success !== undefined) setFailed(!success);
      if (success) setUpdated(Date.now());
    };
  }, []);
  const value = useMemo(() => ({ pending, updated, failed, begin }), [pending, updated, failed, begin]);
  return <Activity.Provider value={value}>{children}</Activity.Provider>;
}

export const useAdminActivity = () => useContext(Activity);

export function AdminSpinner({ label = "Loading" }: { label?: string }) {
  return <span className="adm-loading-status" role="status"><span className="adm-spinner" aria-hidden="true" />{label}</span>;
}
