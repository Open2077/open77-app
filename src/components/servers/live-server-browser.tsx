"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { DemoDataNotice } from "@/components/servers/demo-data-notice";
import { ServerBrowser } from "@/components/servers/server-browser";
import { ServerDetail } from "@/components/servers/server-detail";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { EmptyState, Loader } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { refresh as refreshGlyph } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import { fetchServers, type CatalogServer, type GameServer } from "@/lib/servers";
import { DEMO_SERVERS } from "@/lib/servers-demo";

import styles from "./live-server-browser.module.css";

/** How often the directory re-reads the master while the tab is visible. */
const REFRESH_MS = 30_000;

/**
 * The server browser, driven by the live master directory.
 *
 * The directory refreshes in the browser. Direct profile visits also receive a
 * static snapshot so their name, description and metadata are readable before
 * JavaScript runs; fresh detail data replaces that snapshot after hydration.
 *
 * The browser stays mounted across refreshes so filters, selection, favorites
 * and scroll survive them. A failed refresh keeps the last good list and says
 * so in the freshness readout; only a first load with nothing to show becomes
 * the unreachable state. Nothing is invented while a request is in flight.
 */
function subscribeDirectoryUrl(listener: () => void) {
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

type BrowserProps = { initialId?: string; initialSnapshot?: { server: CatalogServer; capturedAt: number } };

export function LiveServerBrowser({ initialId, initialSnapshot }: BrowserProps) {
  const preview = useSyncExternalStore(
    subscribeDirectoryUrl,
    () =>
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) &&
      new URLSearchParams(window.location.search).get("preview") === "1",
    () => false,
  );

  return preview ? (
    <ServerBrowser
      servers={PREVIEW_SERVERS}
      preview
      status={
        <div className={styles.preview}>
          <DemoDataNotice />
          {/* A full navigation unmounts the local preview and resets its filter state. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/servers">Live directory ↗</a>
        </div>
      }
    />
  ) : (
    <MasterServerBrowser initialId={initialId} initialSnapshot={initialSnapshot} />
  );
}

function MasterServerBrowser({ initialId, initialSnapshot }: BrowserProps) {
  const detailId = useSyncExternalStore(
    subscribeDirectoryUrl,
    () => window.location.pathname.match(/^\/servers\/([^/]+)\/?$/)?.[1] ?? null,
    () => initialId ?? null,
  );
  const lastOpened = useRef<string | null>(null);
  const listScroll = useRef(0);
  const openServer = (id: string) => {
    lastOpened.current = id;
    listScroll.current = window.scrollY;
    window.history.pushState(
      { open77DirectoryFrom: window.location.pathname + window.location.search },
      "",
      `/servers/${encodeURIComponent(id)}${window.location.search}`,
    );
    window.dispatchEvent(new Event("open77-directory-url"));
  };
  const backToList = () => {
    if (window.history.state?.open77DirectoryFrom) window.history.back();
    else {
      window.history.replaceState(null, "", `/servers${window.location.search}`);
      window.dispatchEvent(new Event("open77-directory-url"));
    }
  };
  // The profile replaces the list in place: start it at the top, and give the
  // list its scroll position and focus back on the way out.
  useEffect(() => {
    if (detailId) {
      window.scrollTo({ top: 0 });
      return;
    }
    if (!lastOpened.current) return;
    window.scrollTo({ top: listScroll.current });
    document
      .querySelector<HTMLElement>(`[data-server-id="${CSS.escape(lastOpened.current)}"] a`)
      ?.focus({ preventScroll: true });
  }, [detailId]);

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
      setError(err instanceof MasterApiError ? err.message : "The server directory could not be reached.");
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
      error ? (
        <EmptyState
          eyebrow="Directory unreachable"
          title="Unable to load servers"
          action={
            <Button lines="none" size="sm" border busy={busy} onClick={() => void refresh()}>
              Try again
            </Button>
          }
        >
          {error}
        </EmptyState>
      ) : (
        <div className={styles.loading} role="status" aria-busy="true">
          <Loader label="DIRECTORY" />
          <p>Reading the live directory. Community worlds appear here as soon as the master answers.</p>
          <ul className={styles.skeleton} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} style={{ animationDelay: `${index * 0.12}s` }} />
            ))}
          </ul>
        </div>
      )
    ) : undefined;

  return (
    <>
      <div hidden={detailId !== null} data-list-view>
        <ServerBrowser
          servers={servers}
          isActive={detailId === null}
          onOpenServer={openServer}
          emptyState={emptyState}
          status={
            <div className={cx(styles.freshness, styles[state])}>
              <span className={styles.dot} aria-hidden="true" />
              <span role="status">{readout}</span>
              <button
                type="button"
                className={styles.refresh}
                disabled={busy}
                title="Refresh the directory"
                onClick={() => void refresh()}
              >
                <Icon glyph={refreshGlyph} />
                <span className="sr-only">{busy ? "Refreshing…" : "Refresh"}</span>
              </button>
            </div>
          }
        />
      </div>
      {detailId ? (
        <ServerDetail
          key={detailId}
          id={detailId}
          onBack={backToList}
          initialServer={
            servers.find((server) => server.id === detailId)?.catalog ??
            (initialSnapshot?.server.id === detailId ? initialSnapshot.server : undefined)
          }
          initialNow={initialSnapshot?.server.id === detailId ? initialSnapshot.capturedAt : undefined}
        />
      ) : null}
    </>
  );
}
