"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ServerBrowser } from "@/components/servers/server-browser";
import { DemoDataNotice } from "@/components/servers/demo-data-notice";
import { MasterApiError } from "@/lib/account/api";
import { fetchServers, type GameServer } from "@/lib/servers";
import { DEMO_SERVERS } from "@/lib/servers-demo";

/** How often the directory re-reads the master while the tab is visible. */
const REFRESH_MS = 30_000;

/**
 * The server browser, driven by the live master directory.
 *
 * The directory is fetched in the browser rather than on the server: the master
 * sits behind Cloudflare, which serves CORS for this origin but challenges
 * non-browser fetches, so a server-component fetch would be unreliable. This
 * mirrors how the account surfaces call the master (see `lib/account/api`).
 *
 * The browser stays mounted across refreshes so filters, selection, favorites
 * and scroll survive them. A failed refresh keeps the last good list and says
 * so in the freshness readout; only a first load with nothing to show becomes
 * the unreachable state. Nothing is invented while a request is in flight.
 */
function subscribePreview(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener("open77-directory-url", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("open77-directory-url", listener);
  };
}

const PREVIEW_SERVERS: GameServer[] = DEMO_SERVERS.slice(0, 1).map((server) => ({
  ...server,
  country: "FR",
  locale: "fr-FR",
  lang: "FR",
  links: null,
}));

export function LiveServerBrowser() {
  const preview = useSyncExternalStore(subscribePreview, () =>
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("preview") === "1",
  () => false);

  return preview ? (
    <ServerBrowser servers={PREVIEW_SERVERS} preview status={
      // A full navigation unmounts the local preview and resets its filter state.
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <div className="directory-preview-notice"><DemoDataNotice /><a href="/servers">Live directory ↗</a></div>
    } />
  ) : <MasterServerBrowser />;
}

function MasterServerBrowser() {
  const [servers, setServers] = useState<GameServer[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const list = await fetchServers();
      setServers(list);
      setUpdated(new Date());
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof MasterApiError
          ? err.message
          : "The server directory could not be reached.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const state = error ? "error" : busy ? "loading" : "ok";
  const readout = error
    ? updated
      ? "Refresh failed · showing last results"
      : "Directory unavailable"
    : busy
      ? "Updating…"
      : `Updated ${updated?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  // Before the first successful read there is nothing to list: say why.
  const emptyState =
    updated === null ? (
      <div className="sb-offline" role="status" aria-busy={busy}>
        <span className="directory-kicker">
          {error ? "DIRECTORY UNREACHABLE" : "OPEN//77 DIRECTORY"}
        </span>
        <h2>{error ? "Unable to load servers" : "Reading the live directory…"}</h2>
        <p>{error ?? "Community worlds appear here as soon as the master answers."}</p>
        {error ? (
          <button
            className="btn btn-primary btn-small"
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Try again
          </button>
        ) : (
          <div className="directory-loading" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
    ) : undefined;

  return (
    <ServerBrowser
      servers={servers}
      emptyState={emptyState}
      status={
        <div className="directory-freshness" data-state={state}>
          <span role="status">{readout}</span>
          <button
            className="sb-tool"
            type="button"
            disabled={busy}
            title="Refresh the directory"
            onClick={() => void refresh()}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <span>{busy ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      }
    />
  );
}
