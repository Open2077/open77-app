"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SlashMark } from "@/components/brand";
import { DiscordIcon, GlobeIcon, PlayIcon, PlugIcon } from "@/components/icons";
import { ServerActions } from "@/components/servers/server-actions";
import { ServerImage } from "@/components/servers/server-image";
import { MasterApiError } from "@/lib/account/api";
import {
  catalogToGameServer,
  fetchServer,
  formatProtocol,
  formatUptime,
  isServerLive,
  joinServer,
  occupancyPercent,
  popClass,
  type CatalogServer,
} from "@/lib/servers";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "ok"; server: CatalogServer };

/**
 * The live server detail page, driven by the master's single-server endpoint.
 *
 * Fetched in the browser for the same Cloudflare/CORS reason as the browser list
 * (see `lib/servers`). Every outcome gets an honest, themed state: loading, not
 * found / offline (the id is not in the catalog), master unreachable (with a
 * working retry), and the full detail view. Nothing is invented while the
 * request is in flight or has failed.
 */
export function ServerDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);

  // Reset to the loading state and re-run the effect. Kept out of the effect
  // body so we never call setState synchronously during synchronization.
  const retry = () => {
    setState({ status: "loading" });
    setReload((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchServer(id)
      .then((server) => {
        if (cancelled) return;
        setState(server ? { status: "ok", server } : { status: "missing" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof MasterApiError
              ? error.message
              : "This server's details could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  if (state.status === "loading") {
    return (
      <div className="sb-offline" role="status" aria-busy="true">
        <p className="sb-offline-title">
          <span className="live-dot" aria-hidden="true" /> LOADING SERVER…
        </p>
        <p className="sb-offline-body">Reading this listing from the OPEN//77 master directory.</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="sb-offline" role="status">
        <p className="sb-offline-title">
          <span className="live-dot live-dot-idle" aria-hidden="true" /> DIRECTORY UNREACHABLE
        </p>
        <p className="sb-offline-body">{state.message}</p>
        <div className="sb-offline-ctas">
          <button className="btn btn-ghost" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/servers">
            Back to browser
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="sb-offline" role="status">
        <p className="sb-offline-title">
          <span className="live-dot live-dot-idle" aria-hidden="true" /> SERVER OFFLINE
        </p>
        <p className="sb-offline-body">
          This server is not in the live directory right now. It may have gone offline, or the link
          is out of date — servers appear here only while they are up and beating.
        </p>
        <div className="sb-offline-ctas">
          <button className="btn btn-ghost" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="btn btn-primary" href="/servers">
            Browse live servers
          </Link>
        </div>
      </div>
    );
  }

  return <ServerCard server={state.server} />;
}

function ServerCard({ server }: { server: CatalogServer }) {
  const view = catalogToGameServer(server);
  const live = isServerLive(server);
  const uptime = formatUptime(server.startedAtUtc);
  const website = view.links?.website;
  const discord = view.links?.discord;
  const initial = server.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="sv-card">
      <div className="sv-cover">
        <ServerImage src={server.bannerUrl} kind="banner" className="sv-cover-img" alt="" />
        <span className="sv-cover-scrim" aria-hidden="true" />
        <span className="hud-corners" aria-hidden="true" />
        <div className="sv-cover-bottom">
          <div className="sv-cover-id">
            <div className="sv-idrow">
              <ServerImage src={server.iconUrl} kind="icon" className="sv-icon" label={initial} />
              <div>
                <p className="sv-eyebrow">
                  <SlashMark />
                  SERVER
                  <StatusPill live={live} />
                </p>
                <h1 className="sv-name">{server.name}</h1>
                <p className="sv-sub">
                  {view.mode} · {view.region} region · {view.lang}
                </p>
              </div>
            </div>
          </div>
          <ServerActions id={server.id} />
        </div>
      </div>

      <div className="sv-statbar">
        <div className="sv-stat sv-stat-players">
          <span className="sv-stat-k">Players</span>
          <span className={`sv-stat-v ${popClass(view)}`}>
            {view.players} <span className="sv-stat-dim">/ {view.max}</span>
          </span>
          <span className="players-bar" aria-hidden="true">
            <span style={{ width: `${occupancyPercent(view)}%` }} />
          </span>
        </div>
        <div className="sv-stat">
          <span className="sv-stat-k">Status</span>
          <span className="sv-stat-v">{live ? "Live" : "Offline"}</span>
        </div>
        <div className="sv-stat">
          <span className="sv-stat-k">Region</span>
          <span className="sv-stat-v">{view.region}</span>
        </div>
        <div className="sv-stat">
          <span className="sv-stat-k">Language</span>
          <span className="sv-stat-v">{view.lang}</span>
        </div>
        <div className="sv-stat">
          <span className="sv-stat-k">Version</span>
          <span className="sv-stat-v">{server.serverVersion || "—"}</span>
        </div>
        {view.tags.length > 0 ? (
          <div className="sv-stat sv-stat-tags">
            <span className="sv-stat-k">Tags</span>
            <span className="dstat-tags">
              {view.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          </div>
        ) : null}
      </div>

      <div className="sv-body">
        <div className="sv-main">
          <section className="sv-section">
            <h2 className="sv-h2">
              <SlashMark /> About this server
            </h2>
            <p className="sv-desc">
              {view.desc || "This server has not published a description yet."}
            </p>
          </section>

          <section className="sv-section">
            <h2 className="sv-h2">
              <SlashMark /> Connect
            </h2>
            <div className="sv-connect-box">
              <div className="sv-connect-endpoint">
                <span className="sv-stat-k">Address</span>
                <code className="sv-endpoint">{server.connectEndpoint || "—"}</code>
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => joinServer(server.id)}
              >
                <PlayIcon />
                Connect
              </button>
            </div>
            <p className="sv-connect-note">
              <PlugIcon size={13} /> Connect opens the OPEN//77 launcher and boots straight into
              this world. Install the launcher first if nothing happens.
            </p>
          </section>

          <section className="sv-section">
            <h2 className="sv-h2">
              <SlashMark /> Community
            </h2>
            {website || discord ? (
              <div className="sv-links">
                {website ? (
                  <a className="sv-link-chip" href={website} target="_blank" rel="noreferrer noopener">
                    <GlobeIcon />
                    {displayHost(website)}
                  </a>
                ) : null}
                {discord ? (
                  <a className="sv-link-chip" href={discord} target="_blank" rel="noreferrer noopener">
                    <DiscordIcon />
                    Discord
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="sv-links-empty">This server has not listed any community links.</p>
            )}
          </section>
        </div>

        <aside className="sv-side">
          <section className="sv-section">
            <h2 className="sv-h2">
              <SlashMark /> Server info
            </h2>
            <dl className="sv-info">
              <InfoRow k="Status" v={live ? "Live" : "Offline"} />
              <InfoRow k="Uptime" v={uptime ?? "—"} />
              <InfoRow k="Players" v={`${view.players} / ${view.max}`} />
              <InfoRow k="Version" v={server.serverVersion || "—"} />
              <InfoRow k="Protocol" v={formatProtocol(server.protocol)} />
              <InfoRow k="Game build" v={server.expectedGameBuild ? String(server.expectedGameBuild) : "—"} />
              <InfoRow k="Locale" v={server.locale || "—"} />
              <InfoRow k="Last heartbeat" v={formatRelative(server.lastHeartbeatAtUtc)} />
            </dl>
          </section>
        </aside>
      </div>
    </article>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span className={`sv-status-pill${live ? " is-live" : " is-offline"}`}>
      <span className="live-dot" aria-hidden="true" />
      {live ? "LIVE" : "OFFLINE"}
    </span>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="sv-info-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/** Bare host for a community URL, so a long link renders as a tidy chip. */
function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "12s ago", "4m ago", "2h ago" — for the last-heartbeat readout. */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
