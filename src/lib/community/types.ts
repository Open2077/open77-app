export type CommunityContent = {
  title: string; summary: string; category: string; description: string; installation: string;
  kind: "resource" | "showcase"; maturity: "stable" | "experimental"; tags: string[];
  sourceUrl?: string | null; issueUrl?: string | null; license?: string | null;
  media?: { mediaId: string; altText: string; caption?: string | null }[] | null;
  videoUrls?: string[] | null;
};
export type CommunityProject = {
  projectId: string; ownerAccountId: string; slug: string; state: string;
  revision: number; revisionStatus: string; content: CommunityContent;
  createdAtUtc: string; updatedAtUtc: string; publishedAtUtc: string | null;
};
export type CommunityPage<T> = { items: T[]; nextCursor: string | null };
export type CommunityRelease = {
  releaseId: string; projectId: string; version: string; state: string; channel: "stable" | "prerelease";
  revision: number; metadata: { changelog: string; license: string; installation: string; testedBuilds: string[]; requiredResources: string[] };
  sha256: string | null; sizeBytes: number | null; createdAtUtc: string; publishedAtUtc: string | null; revokedAtUtc: string | null;
  resources: { name: string; relativeRoot: string; manifest: {
    version: string; open77Version: string; dependencies: string[]; permissions: string[]; preloadMods: string[];
  } }[];
  inspection: unknown | null;
};
export type CommunityDelivery = { deliveryId: string; expiresAtUtc: string; downloadUrl: string };
export const categories = [
  { id: "scripts", label: "Scripts", mark: "</>", description: "New possibilities for your world." },
  { id: "gamemodes", label: "Gamemodes", mark: "77", description: "A whole new way to play." },
  { id: "maps", label: "Maps & interiors", mark: "◇", description: "Make Night City your own." },
  { id: "ui", label: "UI & HUD", mark: "▤", description: "Interfaces built for your players." },
  { id: "tools", label: "Tools & libraries", mark: "{ }", description: "A head start for your next creation." },
] as const;
export const categoryLabel = (id: string) => categories.find(item => item.id === id)?.label ?? id;
