/**
 * Page tones.
 *
 * The design gives each audience a colour: yellow for players, blue for server
 * creators, red for developers. Every page takes the tone of the audience it
 * serves; the header logo, link highlights and the page's own accents follow it.
 */
export type Tone = "yellow" | "blue" | "red";

const TONES: Array<[prefix: string, tone: Tone]> = [
  // Most specific first: hosting guides are creator pages inside the docs.
  ["/docs/host-a-server", "blue"],
  ["/docs/server-licensing", "blue"],
  ["/docs/warden", "blue"],
  ["/docs", "red"],
  ["/devblog", "red"],
  ["/dev-tracker", "red"],
  ["/admin", "red"],
  ["/create", "blue"],
  ["/host", "blue"],
  ["/workshop", "blue"],
  ["/ncwe", "blue"],
];

/** The tone of a route; yellow (players) unless a creator or developer section claims it. */
export function toneForPath(pathname: string): Tone {
  for (const [prefix, tone] of TONES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return tone;
  }
  return "yellow";
}
