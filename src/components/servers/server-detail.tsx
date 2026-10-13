"use client";

import { useEffect, useState, type ReactNode } from "react";

import { FlaggedCountry } from "@/components/servers/country-flag";
import { ServerActions } from "@/components/servers/server-actions";
import { ServerImage } from "@/components/servers/server-image";
import { BrandTile, modeArt } from "@/components/servers/server-placeholder";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { CopyButton } from "@/components/ui/code-block";
import { DefinitionList } from "@/components/ui/data";
import { EmptyState, Loader, Meter } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowLeft01, discord, globe02, plug01 } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import { MasterApiError } from "@/lib/account/api";
import { formatLocaleTag } from "@/lib/locale";
import {
  catalogToGameServer,
  fetchServer,
  formatProtocol,
  formatUptime,
  isServerLive,
  normaliseRoster,
  occupancyPercent,
  popClass,
  type CatalogServer,
  type ServerRoster,
} from "@/lib/servers";

import styles from "./server-detail.module.css";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "ok"; server: CatalogServer; now: number };

/**
 * The live server profile, driven by the master's single-server endpoint.
 *
 * Direct visits start with a prerendered snapshot; browser reads refresh it.
 * Every outcome gets an honest state: loading, not found / offline (the id is
 * not in the catalog), master unreachable (with a working retry), and the full
 * profile. Nothing is invented while the request is in flight or has failed.
 */
export function ServerDetail({
  id,
  initialServer,
  initialNow,
  onBack,
}: {
  id: string;
  initialServer?: CatalogServer;
  initialNow?: number;
  /** Return to the directory; the profile replaces it in place. */
  onBack?: () => void;
}) {
  const [state, setState] = useState<State>(() =>
    initialServer ? { status: "ok", server: initialServer, now: initialNow ?? Date.now() } : { status: "loading" },
  );
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
        setState(server ? { status: "ok", server, now: Date.now() } : { status: "missing" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof MasterApiError ? error.message : "This server's details could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const back = onBack ? (
    <button type="button" className={styles.back} onClick={onBack} data-profile-back>
      <Icon glyph={arrowLeft01} />
      Back to server list
    </button>
  ) : null;

  if (state.status !== "ok") {
    return (
      <section className={styles.stateView} aria-label="Server details" data-detail-state={state.status}>
        {back}
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className={styles.stateBody}>
            <Loader label="SERVER" />
            <h1 className={styles.stateTitle}>Loading server</h1>
            <p className={styles.stateText}>Reading this listing from the OPEN//77 master directory.</p>
          </div>
        ) : state.status === "error" ? (
          <EmptyState
            eyebrow="Directory unreachable"
            title="Server details unavailable"
            action={
              <div className={styles.stateActions}>
                <Button lines="none" size="sm" border onClick={retry} data-retry>
                  Try again
                </Button>
                <Button lines="none" size="sm" color="neutral" href="/servers">
                  Back to browser
                </Button>
              </div>
            }
          >
            {state.message}
          </EmptyState>
        ) : (
          <EmptyState
            eyebrow="Server offline"
            title="Not in the directory right now"
            action={
              <div className={styles.stateActions}>
                <Button lines="none" size="sm" href="/servers">
                  Browse live servers
                </Button>
                <Button lines="none" size="sm" border onClick={retry}>
                  Try again
                </Button>
              </div>
            }
          >
            This server is not in the live directory right now. It may have gone offline, or the link is out of date.
            Servers appear here only while they are up and beating.
          </EmptyState>
        )}
      </section>
    );
  }

  return <ServerProfile server={state.server} now={state.now} back={back} />;
}

function ServerProfile({ server, now, back }: { server: CatalogServer; now: number; back: ReactNode }) {
  const view = catalogToGameServer(server);
  const live = isServerLive(server, now);
  const uptime = formatUptime(server.startedAtUtc, now);
  const website = view.links?.website;
  const discordUrl = view.links?.discord;
  const initial = server.name.trim().charAt(0).toUpperCase() || "?";
  const pop = popClass(view);

  return (
    <article className={styles.profile} data-server-profile>
      <header className={styles.hero} data-banner={server.bannerUrl ? "" : undefined}>
        <div className={styles.cover} style={{ backgroundImage: `url(${modeArt(view.mode)})` }} aria-hidden="true">
          <ServerImage src={server.bannerUrl} kind="banner" className={styles.banner} alt="" />
        </div>
        <div className={styles.heroInner}>
          {back}
          <div className={styles.identity}>
            <ServerImage
              src={server.iconUrl}
              kind="icon"
              className={styles.icon}
              label={initial}
              fallback={server.iconUrl ? undefined : <BrandTile />}
            />
            <div className={styles.titleBlock}>
              <p className={styles.kicker}>
                <Eyebrow as="span">{"// Server"}</Eyebrow>
                <span className={live ? styles.live : styles.offline}>
                  <span className={styles.pulse} aria-hidden="true" />
                  {live ? "Live" : "Offline"}
                </span>
              </p>
              <h1 className={server.name.length > 18 ? `${styles.name} ${styles.long}` : styles.name} data-profile-name>
                <span data-glitch={server.name}>{server.name}</span>
              </h1>
              <p className={styles.sub}>
                <Tag variant="solid">{view.mode}</Tag>
                <FlaggedCountry code={view.country} />
                <span>{view.region} region</span>
                <span>{view.lang}</span>
              </p>
            </div>
          </div>
          <ServerActions id={server.id} />
        </div>
      </header>

      <dl className={styles.stats}>
        <div className={`${styles.stat} ${styles.players} ${styles[pop] ?? ""}`}>
          <dt>Players</dt>
          <dd>
            <b>{view.players}</b> / {view.max}
          </dd>
          <Meter value={occupancyPercent(view)} label={`${view.players} of ${view.max} players`} className={styles.meter} />
        </div>
        <div className={styles.stat}>
          <dt>Status</dt>
          <dd>{live ? "Live" : "Offline"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Uptime</dt>
          <dd>{uptime ?? "—"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Country</dt>
          <dd>
            <FlaggedCountry code={view.country} />
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Language</dt>
          <dd>{view.lang}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Version</dt>
          <dd>{server.serverVersion || "—"}</dd>
        </div>
      </dl>

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.h2}>About this server</h2>
            <p className={styles.desc}>{view.desc || "This server has not published a description yet."}</p>
            {view.tags.length > 0 ? (
              <div className={styles.tags}>
                {view.tags.map((tag) => (
                  <Tag key={tag} tone="neutral">
                    {tag}
                  </Tag>
                ))}
              </div>
            ) : null}
          </section>

          <section className={`${styles.section} ${styles.connect}`}>
            <h2 className={styles.h2}>Connect</h2>
            <div className={styles.connectBox}>
              <div className={styles.endpoint}>
                <span className={styles.label}>Address</span>
                <code>{server.connectEndpoint || "—"}</code>
              </div>
              {server.connectEndpoint ? <CopyButton text={server.connectEndpoint} label="Copy address" /> : null}
            </div>
            <p className={styles.note}>
              <Icon glyph={plug01} />
              Connect opens the OPEN//77 launcher and boots straight into this world. Install the launcher first if
              nothing happens.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>Community</h2>
            {website || discordUrl ? (
              <div className={styles.links}>
                {website ? (
                  <Button lines="none" size="sm" color="neutral" border icon={globe02} iconPosition="left" href={website}>
                    {displayHost(website)}
                  </Button>
                ) : null}
                {discordUrl ? (
                  <Button lines="none" size="sm" color="neutral" border icon={discord} iconPosition="left" href={discordUrl}>
                    Discord
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className={styles.muted}>This server has not listed any community links.</p>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <PlayersOnline server={server} now={now} />
          <section className={styles.panel}>
            <h2 className={styles.h2}>Server info</h2>
            <DefinitionList
              items={[
                { label: "Status", value: live ? "Live" : "Offline" },
                { label: "Uptime", value: uptime ?? "—" },
                { label: "Players", value: `${view.players} / ${view.max}` },
                { label: "Version", value: server.serverVersion || "—" },
                { label: "Protocol", value: formatProtocol(server.protocol) },
                { label: "Game build", value: server.expectedGameBuild ? String(server.expectedGameBuild) : "—" },
                { label: "Locale", value: formatLocaleTag(server.locale) },
                { label: "Last heartbeat", value: formatRelative(server.lastHeartbeatAtUtc, now) },
              ]}
            />
          </section>
        </aside>
      </div>
    </article>
  );
}

/**
 * Rows the roster shows before it scrolls instead of growing the sidebar. The
 * box height in the stylesheet (`.roster`) is sized for exactly this many rows;
 * the box is only made focusable once this number is passed, so the two must
 * move together or the last rows become unreachable from the keyboard.
 */
const ROSTER_VISIBLE_ROWS = 10;

/**
 * Who is on this server right now, when the server is willing to say. The
 * count always holds (it comes from the heartbeat); the roster is optional,
 * and its absence is an answer of its own rather than an empty box.
 */
function PlayersOnline({ server, now }: { server: CatalogServer; now: number }) {
  const roster = normaliseRoster(server.players);
  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>
        Online now
        <span className={styles.h2Count}>
          {server.connectedPlayers} / {server.maximumPlayers}
        </span>
      </h2>
      {roster ? (
        <PlayerRoster roster={roster} now={now} />
      ) : (
        <p className={styles.muted}>This server does not publish its player list.</p>
      )}
    </section>
  );
}

function PlayerRoster({ roster, now }: { roster: ServerRoster; now: number }) {
  const stamp = roster.sampledAtUtc ? `as of ${formatRelative(roster.sampledAtUtc, now)}` : null;
  const hidden = roster.total - roster.entries.length;

  if (roster.entries.length === 0) {
    return (
      <>
        <p className={styles.muted}>Nobody is online right now.</p>
        {stamp ? <p className={styles.rosterMore}>Roster {stamp}</p> : null}
      </>
    );
  }

  // Focusable only when it can actually scroll.
  const scrolls = roster.entries.length > ROSTER_VISIBLE_ROWS;

  return (
    <>
      <div
        className={styles.roster}
        data-roster
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? "group" : undefined}
        aria-label={scrolls ? "Players online" : undefined}
      >
        <ul>
          {roster.entries.map((entry, index) => (
            // Two players can carry the same name, so the position keeps keys unique.
            <li key={`${index}-${entry.name}`}>
              <span className={styles.rosterDot} aria-hidden="true" />
              <span className={styles.rosterName}>{entry.name}</span>
              {entry.joinedAtUtc ? <span className={styles.rosterSince}>{formatUptime(entry.joinedAtUtc, now) ?? "—"}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.rosterMore}>
        {hidden > 0 ? `+ ${hidden} more not shown · ` : ""}
        Time played{stamp ? ` · ${stamp}` : ""}
      </p>
    </>
  );
}

/** Bare host for a community URL, so a long link renders as a tidy label. */
function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "12s ago", "4m ago", "2h ago": for the last-heartbeat readout. */
function formatRelative(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
