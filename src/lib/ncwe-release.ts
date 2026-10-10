/**
 * The NCWE Studio build the site offers. One place to change at each release:
 * the values come from the release's `release.json` and `published.json`
 * (NCWE repository, `scripts/release.ps1` and `scripts/publish-release.ps1`).
 */
export const NCWE_RELEASE = {
  version: "0.1.0-beta.8",
  date: "2026-10-10",
  url: "https://cdn.open77.dev/ncwe/studio/0.1.0-beta.8/NCWE-Studio-0.1.0-beta.8-win-x64.zip",
  sha256: "0ca45e06d5465c6d2b0b1b50a43fcdbd2f8fd56cd6695a7fb8cec00e1182e6b5",
  bytes: 216_571_278,
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
