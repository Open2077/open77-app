"use client";
import Link from "next/link";
import { DiscordIcon, GlobeIcon, PlayIcon, StarIcon } from "@/components/icons";
import { FlaggedCountry } from "@/components/servers/country-flag";
import { ServerImage } from "@/components/servers/server-image";
import { languageDisplayName } from "@/lib/locale";
import { occupancyPercent, popClass, type GameServer } from "@/lib/servers";

/** Bare host for a community URL, so a long link renders as a tidy chip. */
function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function addedLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

/**
 * The world currently under inspection, beside the list — the launcher's
 * detail pane, so a player can compare servers without leaving the directory.
 * The full page at `/servers/<id>` still carries the roster and endpoint.
 */
export function ServerInspector({
  server,
  nearYou = false,
  isFavorite,
  onToggleFavorite,
  onConnect,
  onClose,
}: {
  server: GameServer | null;
  /** Same country as the player. */
  nearYou?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onConnect: () => void;
  onClose: () => void;
}) {
  if (!server) {
    return (
      <aside className="directory-detail is-idle" aria-label="Selected server">
        <div className="directory-detail-empty">
          <span className="directory-detail-reticle" aria-hidden="true" />
          <strong>Select a world</strong>
          <small>Choose a server to inspect its profile.</small>
        </div>
      </aside>
    );
  }
  const website = server.links?.website;
  const discord = server.links?.discord;
  const full = server.max > 0 && server.players >= server.max;
  return (
    <aside className="directory-detail" aria-label={`Selected server: ${server.name}`}>
      <div className="directory-detail-cover">
        <ServerImage src={server.banner || null} kind="banner" alt="" />
        <button
          className="directory-detail-close"
          onClick={onClose}
          aria-label="Close server details"
        >
          ×
        </button>
        <span className="directory-detail-mode">{server.mode}</span>
      </div>
      <div className="directory-detail-body">
        <div className="directory-detail-head">
          <ServerImage
            src={server.icon}
            kind="icon"
            className="directory-detail-icon"
            label={server.name.trim().charAt(0).toUpperCase() || "?"}
          />
          <div>
            <span className="directory-kicker">{"// Server"}</span>
            <h2 className="directory-detail-name">{server.name}</h2>
          </div>
        </div>
        <div className="directory-detail-actions">
        <button className="btn btn-primary directory-detail-connect" onClick={onConnect}>
          <PlayIcon size={14} />
          Connect
        </button>
        <button
          className={`fav-btn directory-detail-fav${isFavorite ? " is-fav" : ""}`}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={onToggleFavorite}
        >
          <StarIcon size={16} filled={isFavorite} />
        </button>
        <Link className="directory-detail-more" href={`/servers/${server.id}`}>
          Full details ↗
        </Link>
        </div>
        <p className="directory-detail-desc">
          {server.desc || "This server has not published a description yet."}
        </p>
        <div className="directory-detail-capacity">
          <span className={`directory-detail-capacity-value ${popClass(server)}`}>
            <b>{server.players}</b> / {server.max}
          </span>
          <span className="directory-detail-capacity-label">
            {full ? "Full right now" : "Players online"}
          </span>
          <span className="players-bar" aria-hidden="true">
            <span style={{ width: `${occupancyPercent(server)}%` }} />
          </span>
        </div>
        <dl className="directory-detail-facts">
          <div>
            <dt>Country</dt>
            <dd>
              <FlaggedCountry code={server.country} className="directory-detail-country" />
              {nearYou ? <span className="directory-detail-near">Near you</span> : null}
            </dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{server.region}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{languageDisplayName(server.lang.toLowerCase())}</dd>
          </div>
          <div>
            <dt>Listed</dt>
            <dd>{addedLabel(server.addedDaysAgo)}</dd>
          </div>
        </dl>
        {server.tags.length > 0 ? (
          <div className="directory-detail-tags">
            {server.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {website || discord ? (
          <div className="directory-detail-links">
            {website ? (
              <a href={website} target="_blank" rel="noreferrer noopener">
                <GlobeIcon size={13} />
                {displayHost(website)}
              </a>
            ) : null}
            {discord ? (
              <a href={discord} target="_blank" rel="noreferrer noopener">
                <DiscordIcon size={13} />
                Discord
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
