"use client";

import NextLink from "next/link";

import { FlaggedCountry } from "@/components/servers/country-flag";
import { ServerImage } from "@/components/servers/server-image";
import { BrandTile, modeArt } from "@/components/servers/server-placeholder";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { DefinitionList } from "@/components/ui/data";
import { Meter } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowRight01, cancel01, discord, globe02, play, star } from "@/components/ui/icons";
import { languageDisplayName } from "@/lib/locale";
import { occupancyPercent, popClass, type GameServer } from "@/lib/servers";

import styles from "./server-inspector.module.css";

/** Bare host for a community URL, so a long link renders as a tidy label. */
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
 * The world currently under inspection, beside the list, so a player can
 * compare servers without leaving the directory. The full profile at
 * `/servers/<id>` carries the roster and the endpoint. It only exists while a
 * server is selected: an idle list keeps the whole width.
 */
export function ServerInspector({
  server,
  preview = false,
  onOpen,
  nearYou = false,
  isFavorite,
  onToggleFavorite,
  onConnect,
  onClose,
}: {
  server: GameServer;
  preview?: boolean;
  onOpen?: () => void;
  /** Same country as the player. */
  nearYou?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onConnect: () => void;
  onClose: () => void;
}) {
  const website = server.links?.website;
  const discordUrl = server.links?.discord;
  const full = server.max > 0 && server.players >= server.max;
  return (
    <aside className={styles.inspector} aria-label={`Selected server: ${server.name}`} data-inspector>
      {/* Who it is, then what to do: name, Connect and the full profile fit the
          first screen of the pane; the details follow underneath. */}
      <div className={styles.cover} style={{ backgroundImage: `url(${modeArt(server.mode)})` }}>
        <ServerImage src={server.banner || null} kind="banner" alt="" className={styles.banner} />
        <span className={styles.coverShade} aria-hidden="true" />
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close server details">
          <Icon glyph={cancel01} />
        </button>
        <div className={styles.head}>
          <ServerImage src={server.icon} kind="icon" className={styles.icon} fallback={<BrandTile />} />
          <div className={styles.title}>
            <Tag variant="solid" className={styles.mode}>
              {server.mode}
            </Tag>
            <h2 className={styles.name} data-inspector-name>
              {server.name}
            </h2>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.actions}>
          <Button lines="none" size="sm" icon={play} iconPosition="left" onClick={onConnect} className={styles.connect}>
            Connect
          </Button>
          <button
            type="button"
            className={styles.fav}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onToggleFavorite}
          >
            <Icon glyph={star} />
          </button>
        </div>
        {!preview ? (
          <NextLink
            className={styles.more}
            data-inspector-more
            href={`/servers/${server.id}`}
            onNavigate={
              onOpen
                ? (event) => {
                    event.preventDefault();
                    onOpen();
                  }
                : undefined
            }
          >
            <span>Full profile</span>
            <small>Players and address</small>
            <Icon glyph={arrowRight01} />
          </NextLink>
        ) : null}

        <div className={`${styles.capacity} ${styles[popClass(server)] ?? ""}`}>
          <span className={styles.capacityValue}>
            <b>{server.players}</b> / {server.max}
          </span>
          <span className={styles.capacityLabel}>{full ? "Full right now" : "Players online"}</span>
          <Meter value={occupancyPercent(server)} label={`${server.players} of ${server.max} players`} className={styles.meter} />
        </div>

        <DefinitionList
          className={styles.facts}
          items={[
            {
              label: "Country",
              value: (
                <span className={styles.country}>
                  <FlaggedCountry code={server.country} />
                  {nearYou ? <Tag>Near you</Tag> : null}
                </span>
              ),
            },
            { label: "Language", value: languageDisplayName(server.lang.toLowerCase()) },
            { label: "Region", value: server.region },
            { label: "Listed", value: addedLabel(server.addedDaysAgo) },
          ]}
        />

        <p className={styles.desc}>{server.desc || "This server has not published a description yet."}</p>

        {server.tags.length > 0 ? (
          <div className={styles.tags}>
            {server.tags.map((tag) => (
              <Tag key={tag} tone="neutral">
                {tag}
              </Tag>
            ))}
          </div>
        ) : null}

        {website || discordUrl ? (
          <div className={styles.links}>
            {website ? (
              <a href={website} target="_blank" rel="noreferrer noopener">
                <Icon glyph={globe02} />
                {displayHost(website)}
              </a>
            ) : null}
            {discordUrl ? (
              <a href={discordUrl} target="_blank" rel="noreferrer noopener">
                <Icon glyph={discord} />
                Discord
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}