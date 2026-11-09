"use client";

import { useMessages } from "@/i18n/client";
import type { GameServer } from "@/lib/servers";
import styles from "./server-presentation.module.css";

export function ServerBadges({ server }: { server: Pick<GameServer, "featured" | "official" | "withMods"> }) {
  const m = useMessages("servers").shared.badges;
  return <span className={styles.badges}>
    {server.featured ? <span className={`${styles.badge} ${styles.featured}`} data-badge="featured">{m.featured}</span> : null}
    {server.official ? <span className={`${styles.badge} ${styles.official}`} data-badge="official">{m.official}</span> : null}
    {server.withMods ? <span className={`${styles.badge} ${styles.mods}`} data-badge="mods">{m.withMods}</span> : null}
  </span>;
}
