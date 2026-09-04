"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SlashMark } from "@/components/brand";
import { DiscordIcon, GlobeIcon, PlayIcon, PlugIcon } from "@/components/icons";
import { FlaggedCountry } from "@/components/servers/country-flag";
import { ServerActions } from "@/components/servers/server-actions";
import { ServerImage } from "@/components/servers/server-image";
import { MasterApiError } from "@/lib/account/api";
import { formatLocaleTag } from "@/lib/locale";
import {
  catalogToGameServer,
  fetchServer,
  formatProtocol,
  formatUptime,
  isServerLive,
  joinServer,
  normaliseRoster,
  occupancyPercent,
  popClass,
  type CatalogServer,
  type ServerRoster,
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
                  {view.mode} · <FlaggedCountry className="sv-country" code={view.country} /> ·{" "}
                  {view.region} region · {view.lang}
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
          <span className="sv-stat-k">Country</span>
          <span className="sv-stat-v">
            <FlaggedCountry className="sv-country" code={view.country} />
          </span>
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
          <PlayersOnline server={server} />

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
              <InfoRow k="Locale" v={formatLocaleTag(server.locale)} />
              <InfoRow k="Last heartbeat" v={formatRelative(server.lastHeartbeatAtUtc)} />
            </dl>
          </section>
        </aside>
      </div>
    </article>
  );
}

/**
 * Rows the list shows before it scrolls instead of growing the sidebar. Ten
 * fills the column beside "Server info" without pushing it off the fold.
 *
 * `.sv-playerlist-box` sizes itself to exactly this many rows; the two are one
 * decision written in two places, and they have to move together — a box that
 * fits nine rows while this says ten leaves the tenth unreachable from the
 * keyboard, because the box is only made focusable once this number is passed.
 */
const ROSTER_VISIBLE_ROWS = 10;

/**
 * Who is on this server right now, when the server is willing to say.
 *
 * The count in the heading is the part that always holds: it comes from the
 * heartbeat and has been on this page since it existed. The roster beneath it is
 * optional, and its absence is an answer rather than a failure — an older server
 * build, or an owner who turned it off — so that case gets a sentence of its own
 * instead of an empty box or a spinner that never resolves.
 */
function PlayersOnline({ server }: { server: CatalogServer }) {
  const roster = normaliseRoster(server.players);

  return (
    <section className="sv-section">
      <h2 className="sv-h2">
        <SlashMark /> Online now
        <span className="mini-chip">
          {server.connectedPlayers} / {server.maximumPlayers}
        </span>
      </h2>
      {roster ? (
        <PlayerRoster roster={roster} />
      ) : (
        <p className="sv-links-empty">This server does not publish its player list.</p>
      )}
    </section>
  );
}

/**
 * The roster itself, once {@link normaliseRoster} has vetted it.
 *
 * A full server is 32 rows and the cap allows 200, which is far too little to be
 * worth virtualising: the whole list is in the DOM, so find-in-page works and a
 * screen reader can walk it as one list. What it gets instead is a fixed-height
 * scroll box, because a sidebar that grows with the population would push
 * everything else a screen and a half down the page.
 */
function PlayerRoster({ roster }: { roster: ServerRoster }) {
  const stamp = roster.sampledAtUtc ? `as of ${formatRelative(roster.sampledAtUtc)}` : null;
  const hidden = roster.total - roster.entries.length;

  if (roster.entries.length === 0) {
    return (
      <>
        <p className="sv-links-empty">Nobody is online right now.</p>
        {stamp ? <p className="sv-playerlist-more">Roster {stamp}</p> : null}
      </>
    );
  }

  // Focusable only when it can actually scroll: overflow that cannot be reached
  // from the keyboard is unreadable without a mouse, but a four-player server
  // should not pay for that with a dead tab stop.
  const scrolls = roster.entries.length > ROSTER_VISIBLE_ROWS;

  return (
    <>
      <div
        className="sv-playerlist-box"
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? "group" : undefined}
        aria-label={scrolls ? "Players online" : undefined}
      >
        <ul className="sv-playerlist">
          {roster.entries.map((entry, index) => (
            // Two players can carry the same name, and two long names can clip to
            // the same string, so the position is what makes the key unique.
            <li key={`${index}-${entry.name}`}>
              <span className="live-dot" aria-hidden="true" />
              <span className="sv-player-name">{entry.name}</span>
              {entry.joinedAtUtc ? (
                <span className="sv-player-since">{formatUptime(entry.joinedAtUtc) ?? "—"}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="sv-playerlist-more">
        {hidden > 0 ? `+ ${hidden} more not shown · ` : ""}
        Time played{stamp ? ` · ${stamp}` : ""}
      </p>
    </>
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
