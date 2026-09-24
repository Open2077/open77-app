/** Small, consistent outline icons for documentation topics. */
const paths: Record<string, string> = {
  home: "m3 10 9-7 9 7v10H5V10m4 10v-7h6v7",
  introduction: "M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4m8 2v15",
  server: "M4 3h16v7H4V3m0 11h16v7H4v-7m3-8h1m-1 11h1m8-11h1m-1 11h1",
  scripting: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14",
  networking: "M9 3h6v6H9V3m3 6v5m-6 0h12M6 14v3m12-3v3M3 17h6v5H3v-5m12 0h6v5h-6v-5",
  gamemodes: "M6 4v16m12-16v16M2 8h8m4 8h8M4 6h4v4H4V6m12 8h4v4h-4v-4",
  players: "M10 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-4 7 4-3 4 1 3 5m-7-6-1 6-4 6m4-6 6 2 1 4",
  characters: "M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0m-4 16v-3a8 8 0 0 1 16 0v3",
  animations: "m13 2-3 7 5 2-3 11m-9-10 7-3 11 1m-11 5-6 5",
  cyberware: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4m0 5v9m-4-4h8",
  vehicles: "m4 10 2-6h12l2 6M3 10h18v8H3v-8m2 8v3m14-3v3M6 14h2m8 0h2",
  world: "m12 2 9 5v10l-9 5-9-5V7l9-5m0 10v10M3 7l9 5 9-5",
  map: "m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5m6-3v17m6-14v17",
  targeting: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16m0-3v6m0 10v6M1 12h6m10 0h6m-11-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  interfaces: "M3 3h18v18H3V3m0 5h18M9 8v13",
  cameras: "M4 6h4l2-3h4l2 3h4v14H4V6m4 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  audio: "M3 9h4l5-5v16l-5-5H3V9m13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16",
  assets: "m3 7 9-5 9 5v11l-9 4-9-4V7m0 0 9 5 9-5m-9 5v10M8 4l9 5",
  reference: "M8 3H3v18h5m8-18h5v18h-5m-6-12-3 3 3 3m4-6 3 3-3 3",
};

export function DocsIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.introduction} /></svg>;
}
