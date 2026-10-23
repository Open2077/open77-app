/**
 * The NCWE Studio build the site offers. One place to change at each release:
 * the values come from the release's `release.json` and `published.json`
 * (NCWE repository, `scripts/release.ps1` and `scripts/publish-release.ps1`).
 */
export const NCWE_RELEASE = {
  version: "0.1.0-beta.15",
  date: "2026-10-23",
  url: "https://cdn.open77.dev/ncwe/studio/0.1.0-beta.15/NCWE-Studio-0.1.0-beta.15-win-x64.zip",
  sha256: "fea8e4dc827dee77837bbad8ecd13b23425d1a09fff9b3aecf0fce443f7080ec",
  bytes: 218_331_911,
  game: "2.5",
} as const;

/**
 * ArchiveXL has no official release for Cyberpunk 2.5 yet: the OPEN//77 build players install meanwhile
 * (github.com/Open2077/archive-xl, the GitHub release asset mirrored on our CDN).
 */
export const NCWE_ARCHIVEXL = {
  version: "1.27.5-open77.5",
  url: "https://cdn.open77.dev/ncwe/archivexl/1.27.5-open77.5/ArchiveXL-1.27.5-open77.5.zip",
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
