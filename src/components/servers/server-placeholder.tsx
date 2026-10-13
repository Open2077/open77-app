import styles from "./server-placeholder.module.css";

/**
 * Placeholder for servers that have not uploaded an icon: the OPEN//77 "//77"
 * mark, muted. It never competes with real icons, and the game type is
 * already written on the row. The moment an operator uploads an icon,
 * `ServerImage` shows that instead.
 */
export function BrandTile() {
  return (
    <span className={styles.tile} aria-hidden="true">
      <span className={styles.slash}>{"//"}</span>77
    </span>
  );
}

/** Wide key art for a game type, for covers when the server set no banner. */
export function modeArt(mode: string): string {
  switch (mode) {
    case "Roleplay":
      return "/home/img/server-roleplay.webp";
    case "Racing":
      return "/home/img/server-racing.webp";
    case "PvP":
      return "/home/img/devs-bg.webp";
    case "Freeroam":
      return "/home/img/players-bg.webp";
    case "Social":
      return "/home/img/creators-bg.webp";
    default:
      return "/home/img/server-custom-worlds.webp";
  }
}
