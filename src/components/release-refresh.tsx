"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-read request-time CDN pointers without losing scroll, access state or focus.
 *
 * Unstyled on purpose: it imports nothing but React and the router, so the
 * release-channel regression (scripts/check-release-channels.mjs) can run the
 * real effect in Node. The caller styles it through `className`
 * (see `ReleaseStatus` in components/downloads).
 */
export function ReleaseRefresh({ className }: { className?: string } = {}) {
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
    <div className={className} data-release-refresh data-pending={pending || undefined}>
      <span>Live CDN versions · checked every minute while this page is visible.</span>
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
        <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
          <path
            d="M20.25 12a8.25 8.25 0 1 1-2.42-5.83M20.25 3.75v4.5h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span role="status">{pending ? "Checking CDN…" : "Check for updates"}</span>
      </button>
    </div>
  );
}
