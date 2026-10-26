/**
 * The NCWE Studio build the site offers. One place to change at each release:
 * the values come from the release's `release.json` and `published.json`
 * (NCWE repository, `scripts/release.ps1` and `scripts/publish-release.ps1`).
 */
export const NCWE_RELEASE = {
  version: "0.1.0-beta.16",
  date: "2026-10-26",
  url: "https://cdn.open77.dev/ncwe/studio/0.1.0-beta.16/NCWE-Studio-0.1.0-beta.16-win-x64.zip",
  sha256: "efe3a7d68feef70b6019b3f95b6127ff7903dc288a803c46dc780e980e759dd1",
  bytes: 218_330_449,
  game: "2.5",
} as const;

/**
 * The OPEN//77 build of ArchiveXL 1.28.0 that NCWE worlds need on Cyberpunk 2.5: the official 1.28.0 crashes
 * on deleted game objects and cannot remove their collision (github.com/Open2077/archive-xl, the GitHub
 * release asset mirrored on our CDN).
 */
export const NCWE_ARCHIVEXL = {
  version: "1.28.0-open77.1",
  url: "https://cdn.open77.dev/ncwe/archivexl/1.28.0-open77.1/ArchiveXL-1.28.0-open77.1.zip",
  source: "https://github.com/Open2077/archive-xl",
} as const;

/** The trailer on the OPEN//77 YouTube channel ("NCWE - Shape Night City as you want"). */
export const NCWE_TRAILER = {
  id: "WO2kvbzGIXM",
  title: "NCWE - Shape Night City as you want",
  length: "2:16",
  poster: "/assets/ncwe/trailer-poster.jpg",
} as const;

export function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
