"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import NextLink from "next/link";
import { FlaggedCountry } from "./country-flag";
import { useServerFormat } from "./server-format";
import { ServerImage } from "./server-image";
import { BrandTile } from "./server-placeholder";
import { ServerText } from "./server-text";
import { ServerBadges } from "./server-badges";
import { ServerCommunityLinks } from "./server-community-links";
import { ServerPlayerActivity } from "./server-player-activity";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { cancel01, play, star } from "@/components/ui/icons";
import { localizeHref } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { languageDisplayName } from "@/lib/locale";
import { plainLauncherText } from "@/lib/launcher-text";
import type { GameServer } from "@/lib/servers";
import styles from "./server-inspector.module.css";

const STRONG = { strong: (chunk: ReactNode) => <strong>{chunk}</strong> };

/** A non-modal drawer below the shell: navigation remains usable above it. */
export function ServerInspector({ server, preview = false, onOpen, nearYou = false, isFavorite, onToggleFavorite, onConnect, onClose }: {
  server: GameServer; preview?: boolean; onOpen?: () => void; nearYou?: boolean;
  isFavorite: boolean; onToggleFavorite: () => void; onConnect: () => void; onClose: () => void;
}) {
  const heading = useId();
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const { m: messages, locale, tag: languageTag } = useServerFormat();
  const m = messages.inspector;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = overflow;
      if (previous?.isConnected && (element?.contains(document.activeElement) || document.activeElement === document.body)) previous.focus({ preventScroll: true });
    };
  }, []);
  return <div className={styles.layer}>
    <button type="button" className={styles.scrim} tabIndex={-1} aria-label={m.close} onClick={onClose} />
    <section ref={panel} className={styles.inspector} role="dialog" aria-labelledby={heading} data-inspector onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
      <button ref={close} type="button" className={styles.close} onClick={onClose} aria-label={m.close}><Icon glyph={cancel01} /></button>
      <header className={styles.hero}>
        <ServerImage src={server.banner} kind="banner" className={styles.banner} />
        <div className={styles.identity}>
          <ServerImage src={server.icon} kind="icon" className={styles.icon} fallback={<BrandTile />} />
          <div><p className={styles.mode}>{server.mode}</p><h2 id={heading} data-inspector-name><ServerText text={server.name} /></h2></div>
        </div>
        <div className={styles.join}>
          <p><strong>{server.players}</strong><span> / {server.max}<small>{m.playersOnline}</small></span></p>
          <Button lines="none" size="sm" icon={play} iconPosition="left" onClick={onConnect}>{m.join}</Button>
          <button type="button" className={styles.favorite} aria-pressed={isFavorite} onClick={onToggleFavorite}><Icon glyph={star} />{isFavorite ? m.saved : messages.shared.addToFavorites}</button>
        </div>
        <div className={styles.tags}><ServerBadges server={server} />{server.tags.map(tag => <Tag key={tag} tone="neutral">{tag}</Tag>)}</div>
      </header>
      <div className={styles.body}>
        <section className={styles.about}><h3>{messages.shared.aboutServer}</h3><p className={styles.description}><ServerText text={server.desc || messages.shared.noDescription} /></p>
          <ServerCommunityLinks server={server} />
          <dl className={styles.facts}><div><dt>{m.facts.country}</dt><dd><FlaggedCountry code={server.country} languageTag={languageTag} unspecified={messages.shared.regionNotSpecified} /></dd></div><div><dt>{m.facts.language}</dt><dd>{languageDisplayName(server.lang.toLowerCase(), languageTag)}</dd></div><div><dt>{m.facts.mode}</dt><dd>{server.mode}</dd></div>{nearYou ? <div><dt>{m.facts.location}</dt><dd>{m.facts.nearYou}</dd></div> : null}</dl>
        </section>
        <ServerPlayerActivity id={server.id} preview={preview} />
      </div>
      <footer className={styles.footer}>
        {server.withMods ? <p>{rich(m.withMods, STRONG)}</p> : null}
        {!preview ? <NextLink data-inspector-more href={localizeHref(`/servers/${server.id}`, locale)} onNavigate={onOpen ? event => { event.preventDefault(); onOpen(); } : undefined} aria-label={fill(m.fullProfileLabel, { name: plainLauncherText(server.name) })}>{m.fullProfile} <span>{m.fullProfileHint}</span></NextLink> : null}
      </footer>
    </section>
  </div>;
}
