"use client";

import { useEffect, useState } from "react";

import { DiscordIcon } from "@/components/icons";
import { ServerBrowser } from "@/components/servers/server-browser";
import { MasterApiError } from "@/lib/account/api";
import { fetchServers, type GameServer } from "@/lib/servers";
import { site } from "@/lib/site";

/**
 * The server browser, driven by the live master directory.
 *
 * The directory is fetched in the browser rather than on the server: the master
 * sits behind Cloudflare, which serves CORS for this origin but challenges
 * non-browser fetches, so a server-component fetch would be unreliable. This
 * mirrors how the account surfaces call the master (see `lib/account/api`).
 *
 * Three states get their own honest UI — loading, unreachable, and loaded (the
 * empty case is handled inside {@link ServerBrowser}). None of them invent
 * listings while the request is in flight or has failed.
 */
export function LiveServerBrowser() {
  const [servers, setServers] = useState<GameServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchServers()
      .then((list) => {
        if (!cancelled) setServers(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setServers([]);
        setError(
          err instanceof MasterApiError
            ? err.message
            : "The server directory could not be loaded.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (error) {
    return (
      <div className="sb-offline" role="status">
        <p className="sb-offline-title">
          <span className="live-dot live-dot-idle" aria-hidden="true" /> DIRECTORY UNREACHABLE
        </p>
        <p className="sb-offline-body">{error}</p>
        <div className="sb-offline-ctas">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setError(null);
              setServers(null);
              setReload((n) => n + 1);
            }}
          >
            Try again
          </button>
          {site.links.discord ? (
            <a
              className="btn btn-discord"
              href={site.links.discord}
              target="_blank"
              rel="noreferrer noopener"
            >
              <DiscordIcon size={16} />
              Join our Discord
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (servers === null) {
    return (
      <div className="sb-offline" role="status" aria-busy="true">
        <p className="sb-offline-title">
          <span className="live-dot" aria-hidden="true" /> LOADING SERVERS…
        </p>
        <p className="sb-offline-body">Reading the live OPEN//77 directory.</p>
      </div>
    );
  }

  return <ServerBrowser servers={servers} featured={null} />;
}
