"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { FlaggedCountry } from "@/components/servers/country-flag";
import { ServerActions } from "@/components/servers/server-actions";
import { useServerFormat, type ServerFormat } from "@/components/servers/server-format";
import { ServerText } from "@/components/servers/server-text";
import { ServerBadges } from "@/components/servers/server-badges";
import { ServerCommunityLinks } from "@/components/servers/server-community-links";
import { ServerPlayerActivity } from "@/components/servers/server-player-activity";
import { plainLauncherText } from "@/lib/launcher-text";
import { ServerImage } from "@/components/servers/server-image";
import { BrandTile, modeArt } from "@/components/servers/server-placeholder";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { CopyButton } from "@/components/ui/code-block";
import { DefinitionList } from "@/components/ui/data";
import { EmptyState, Loader, Meter } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowLeft01, plug01 } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import { MasterApiError } from "@/lib/account/api";
import { fill } from "@/i18n/format";
import { formatLocaleTag } from "@/lib/locale";
import {
  catalogToGameServer,
  fetchServer,
  formatProtocol,
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
  const f = useServerFormat();
  const m = f.m.detail;
  // Read through a ref: the fallback wording must not re-run the fetch.
  const loadError = useRef(m.loadError);
  useEffect(() => {
    loadError.current = m.loadError;
  });

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
          message: error instanceof MasterApiError ? error.message : loadError.current,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const back = onBack ? (
    <button type="button" className={styles.back} onClick={onBack} data-profile-back>
      <Icon glyph={arrowLeft01} />
      {m.back}
    </button>
  ) : null;

  if (state.status !== "ok") {
    return (
      <section className={styles.stateView} aria-label={m.label} data-detail-state={state.status}>
        {back}
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className={styles.stateBody}>
            <Loader label={m.loaderLabel} />
            <h1 className={styles.stateTitle}>{m.loadingTitle}</h1>
            <p className={styles.stateText}>{m.loadingBody}</p>
          </div>
        ) : state.status === "error" ? (
          <EmptyState
            eyebrow={f.m.shared.directoryUnreachable}
            title={m.errorTitle}
            action={
              <div className={styles.stateActions}>
                <Button lines="none" size="sm" border onClick={retry} data-retry>
                  {f.m.shared.tryAgain}
                </Button>
                <Button lines="none" size="sm" color="neutral" href="/servers">
                  {m.backToBrowser}
                </Button>
              </div>
            }
          >
            {state.message}
          </EmptyState>
        ) : (
          <EmptyState
            eyebrow={m.missingEyebrow}
            title={m.missingTitle}
            action={
              <div className={styles.stateActions}>
                <Button lines="none" size="sm" href="/servers">
                  {m.browseLive}
                </Button>
                <Button lines="none" size="sm" border onClick={retry}>
                  {f.m.shared.tryAgain}
                </Button>
              </div>
            }
          >
            {m.missingBody}
          </EmptyState>
        )}
      </section>
    );
  }

  return <ServerProfile server={state.server} now={state.now} back={back} f={f} />;
}

function ServerProfile({ server, now, back, f }: { server: CatalogServer; now: number; back: ReactNode; f: ServerFormat }) {
  const { m: messages } = f;
  const m = messages.detail;
  const view = catalogToGameServer(server);
  const live = isServerLive(server, now);
  const uptime = f.uptime(server.startedAtUtc, now);
  const status = live ? m.live : m.offline;
  const plainName = plainLauncherText(server.name);
  const initial = plainName.trim().charAt(0).toUpperCase() || "?";
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
                <Eyebrow as="span">{m.kicker}</Eyebrow>
                <span className={live ? styles.live : styles.offline}>
                  <span className={styles.pulse} aria-hidden="true" />
                  {status}
                </span>
              </p>
              <h1 className={plainName.length > 18 ? `${styles.name} ${styles.long}` : styles.name} data-profile-name>
                <ServerText text={server.name} />
              </h1>
              <p className={styles.sub}>
                <Tag variant="solid">{view.mode}</Tag>
                <FlaggedCountry code={view.country} languageTag={f.tag} unspecified={messages.shared.regionNotSpecified} />
                <span>{fill(m.region, { region: view.region })}</span>
                <span>{view.lang}</span>
              </p>
              <ServerBadges server={view} />
            </div>
          </div>
          <ServerActions id={server.id} />
        </div>
      </header>

      <dl className={styles.stats}>
        <div className={`${styles.stat} ${styles.players} ${styles[pop] ?? ""}`}>
          <dt>{m.stats.players}</dt>
          <dd>
            <b>{view.players}</b> / {view.max}
          </dd>
          <Meter
            value={occupancyPercent(view)}
            label={f.count(m.meter, view.max, { players: view.players, max: view.max })}
            className={styles.meter}
          />
        </div>
        <div className={styles.stat}>
          <dt>{m.stats.status}</dt>
          <dd>{status}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{m.stats.uptime}</dt>
          <dd>{uptime ?? "—"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{m.stats.country}</dt>
          <dd>
            <FlaggedCountry code={view.country} languageTag={f.tag} unspecified={messages.shared.regionNotSpecified} />
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>{m.stats.language}</dt>
          <dd>{view.lang}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{m.stats.version}</dt>
          <dd>{server.serverVersion || "—"}</dd>
        </div>
      </dl>

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.h2}>{messages.shared.aboutServer}</h2>
            <p className={styles.desc}><ServerText text={view.desc || messages.shared.noDescription} /></p>
            <ServerCommunityLinks server={view} />
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

          <section className={styles.section}><ServerPlayerActivity id={server.id} /></section>

          <section className={`${styles.section} ${styles.connect}`}>
            <h2 className={styles.h2}>{m.connect.title}</h2>
            <div className={styles.connectBox}>
              <div className={styles.endpoint}>
                <span className={styles.label}>{m.connect.address}</span>
                <code>{server.connectEndpoint || "—"}</code>
              </div>
              {server.connectEndpoint ? <CopyButton text={server.connectEndpoint} label={m.connect.copy} /> : null}
            </div>
            <p className={styles.note}>
              <Icon glyph={plug01} />
              {m.connect.note}
            </p>
          </section>

        </div>

        <aside className={styles.side}>
          <PlayersOnline server={server} now={now} f={f} />
          <section className={styles.panel}>
            <h2 className={styles.h2}>{m.info.title}</h2>
            <DefinitionList
              items={[
                { label: m.info.status, value: status },
                { label: m.info.uptime, value: uptime ?? "—" },
                { label: m.info.players, value: `${view.players} / ${view.max}` },
                { label: m.info.version, value: server.serverVersion || "—" },
                { label: m.info.protocol, value: formatProtocol(server.protocol) },
                { label: m.info.gameBuild, value: server.expectedGameBuild ? String(server.expectedGameBuild) : "—" },
                { label: m.info.locale, value: formatLocaleTag(server.locale) },
                { label: m.info.lastHeartbeat, value: f.relative(server.lastHeartbeatAtUtc, now) },
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
function PlayersOnline({ server, now, f }: { server: CatalogServer; now: number; f: ServerFormat }) {
  const roster = normaliseRoster(server.players);
  const m = f.m.detail.roster;
  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>
        {m.title}
        <span className={styles.h2Count}>
          {server.connectedPlayers} / {server.maximumPlayers}
        </span>
      </h2>
      {roster ? (
        <PlayerRoster roster={roster} now={now} f={f} />
      ) : (
        <p className={styles.muted}>{m.private}</p>
      )}
    </section>
  );
}

function PlayerRoster({ roster, now, f }: { roster: ServerRoster; now: number; f: ServerFormat }) {
  const m = f.m.detail.roster;
  const stamp = roster.sampledAtUtc ? fill(m.asOf, { time: f.relative(roster.sampledAtUtc, now) }) : null;
  const hidden = roster.total - roster.entries.length;

  if (roster.entries.length === 0) {
    return (
      <>
        <p className={styles.muted}>{m.empty}</p>
        {stamp ? <p className={styles.rosterMore}>{fill(m.sampled, { stamp })}</p> : null}
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
        aria-label={scrolls ? m.label : undefined}
      >
        <ul>
          {roster.entries.map((entry, index) => (
            // Two players can carry the same name, so the position keeps keys unique.
            <li key={`${index}-${entry.name}`}>
              <span className={styles.rosterDot} aria-hidden="true" />
              <span className={styles.rosterName}>{entry.name}</span>
              {entry.joinedAtUtc ? <span className={styles.rosterSince}>{f.uptime(entry.joinedAtUtc, now) ?? "—"}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.rosterMore}>
        {[hidden > 0 ? f.count(m.more, hidden) : null, m.timePlayed, stamp].filter(Boolean).join(" · ")}
      </p>
    </>
  );
}
