"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Re-read request-time CDN pointers without losing scroll, access state or focus. */
export function ReleaseRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || Date.now() - lastRefresh < 5_000) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return (
    <div className="release-refresh" data-release-refresh>
      <span>Live CDN versions · checked every minute while this page is visible.</span>
      <button className="btn btn-ghost" type="button" disabled={pending}
        onClick={() => startTransition(() => router.refresh())}>
        {pending ? <span className="release-spinner" aria-hidden="true" /> : null}
        <span role="status">{pending ? "Checking CDN…" : "Check for updates"}</span>
      </button>
    </div>
  );
}
