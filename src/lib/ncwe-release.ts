/**
 * The NCWE Studio build the site offers. One place to change at each release:
 * the values come from the release's `release.json` and `published.json`
 * (NCWE repository, `scripts/release.ps1` and `scripts/publish-release.ps1`).
 */
export const NCWE_RELEASE = {
  version: "0.1.0-beta.10",
  date: "2026-10-12",
  url: "https://cdn.open77.dev/ncwe/studio/0.1.0-beta.10/NCWE-Studio-0.1.0-beta.10-win-x64.zip",
  sha256: "11d30c5056a2518b2182e0433ca658e0dbc7352c7bb79e280696ebe266af64d4",
  bytes: 217_186_557,
  game: "2.31",
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
