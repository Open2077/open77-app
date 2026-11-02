import type { GameServer } from "@/lib/servers";
import styles from "./server-presentation.module.css";

export function ServerBadges({ server }: { server: Pick<GameServer, "featured" | "official" | "withMods"> }) {
  return <span className={styles.badges}>
    {server.featured ? <span className={`${styles.badge} ${styles.featured}`} data-badge="featured">Featured</span> : null}
    {server.official ? <span className={`${styles.badge} ${styles.official}`} data-badge="official">Official</span> : null}
    {server.withMods ? <span className={`${styles.badge} ${styles.mods}`} data-badge="mods">With mods</span> : null}
  </span>;
}
