/**
 * Placeholder artwork for servers that have not uploaded their own.
 *
 * The icon tile shows the OPEN//77 mark, muted — the platform's default
 * avatar, the way a server without a logo reads on any network. It never
 * competes with real icons, and the game type is already written on the row.
 * The moment an operator uploads an icon, `ServerImage` shows that instead.
 */
export function BrandTile() {
  // The mark is a CSS background so the "//77" band can be cropped to the tile.
  return <span className="brand-tile" aria-hidden="true" />;
}

/** Wide artwork for a game type, for covers when the server set no banner. */
export function modeArt(mode: string): string {
  switch (mode) {
    case "Roleplay":
      return "/assets/exp-roleplay.jpg";
    case "Racing":
      return "/assets/exp-racing.jpg";
    case "PvP":
      return "/assets/exp-combat.jpg";
    case "Freeroam":
      return "/assets/exp-exploration.jpg";
    case "Social":
      return "/assets/play-together.jpg";
    default:
      return "/assets/exp-custom.jpg";
  }
}
