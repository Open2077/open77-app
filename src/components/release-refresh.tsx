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
const ENGLISH = {
  note: "Live CDN versions · checked every minute while this page is visible.",
  checking: "Checking CDN…",
  check: "Check for updates",
};

/** `labels` carries the page language; it is a prop so this file stays free of the i18n modules. */
export function ReleaseRefresh({ className, labels = ENGLISH }: { className?: string; labels?: typeof ENGLISH } = {}) {
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
      <span>{labels.note}</span>
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
        <span role="status">{pending ? labels.checking : labels.check}</span>
      </button>
    </div>
  );
}
