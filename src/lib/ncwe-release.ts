/**
 * The NCWE Studio build the site offers. One place to change at each release:
 * the values come from the release's `release.json` and `published.json`
 * (NCWE repository, `scripts/release.ps1` and `scripts/publish-release.ps1`).
 */
export const NCWE_RELEASE = {
  version: "0.1.0-beta.12",
  date: "2026-10-19",
  url: "https://cdn.open77.dev/ncwe/studio/0.1.0-beta.12/NCWE-Studio-0.1.0-beta.12-win-x64.zip",
  sha256: "c2a4d0511958516aaeb0cef111d9cc6048c25c7e8a5ad586b3a718da5acc34e4",
  bytes: 218_335_213,
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
