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
  creatorHandle: string | null;
  upvotes: number;
};
export type CommunityProjectState = { projectId: string; voted: boolean; saved: boolean; subscribed: boolean };
export type CommunitySavedProject = { projectId: string; savedAtUtc: string; project: CommunityProject | null };
export type CommunityProfile = { handle: string; bio: string; links: { label: string; url: string }[]; revision: number; createdAtUtc: string; updatedAtUtc: string; avatarMediaId: string | null };
export type CommunityCreatorPage = { profile: CommunityProfile; projects: CommunityPage<CommunityProject> };
export type CommunityPage<T> = { items: T[]; nextCursor: string | null };
export type CommunityModerationState = { projectId: string; state: string; moderationRevision: number; suspendedFromState: string | null };
export type CommunityActivity = { activityId: string; action: string; reason: string; details: unknown; createdAtUtc: string; actorDisplayName: string | null; relatedReleaseId: string | null };
export type CommunityReviewItem = { id: string; projectId: string; title: string; slug: string; kind: "projects" | "releases"; revision: number; version: string | null; queuedAtUtc: string };
export type CommunityReport = { reportId: string; reporterAccountId: string; targetType: "project" | "release" | "comment" | "appeal"; targetId: string; projectId: string; reason: string; state: "open" | "action_taken" | "dismissed"; assignedAccountId: string | null; createdAtUtc: string; targetBody: string | null; revision: number; publicResponse: string | null };
export type CommunityAppeal = { appealId: string; decisionId: string; reason: string; state: CommunityReport["state"]; response: string | null; createdAtUtc: string };
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
export type CommunityMedia = { mediaId: string; derivatives: { name: "card" | "gallery" | "full"; width: number; height: number; sizeBytes: number; url: string }[] };
export type CommunityUpload = {
  uploadId: string; projectId: string | null; releaseId: string | null; kind: "package" | "image";
  state: string; maximumBytes: number; artifactId: string | null; expiresAtUtc: string;
  mediaId: string | null; inspectionCode: string | null;
};
export type CommunityUploadItem = { upload: CommunityUpload; originalName: string; createdAtUtc: string };
export type CommunityUploadGrant = { uploadId: string; token: string; maximumBytes: number; expiresAtUtc: string; uploadUrl: string };
export type CommunityReleaseDraft = Pick<CommunityRelease, "releaseId" | "projectId" | "version" | "state" | "channel">;
export const categories = [
  { id: "scripts", label: "Scripts", mark: "</>", description: "New possibilities for your world." },
  { id: "gamemodes", label: "Gamemodes", mark: "77", description: "A whole new way to play." },
  { id: "maps", label: "Maps & interiors", mark: "◇", description: "Make Night City your own." },
  { id: "ui", label: "UI & HUD", mark: "▤", description: "Interfaces built for your players." },
  { id: "tools", label: "Tools & libraries", mark: "{ }", description: "A head start for your next creation." },
] as const;
export const categoryLabel = (id: string) => categories.find(item => item.id === id)?.label ?? id;
export interface CommunityNotification {
  notificationId: string;
  kind: string;
  content: { title: string; message: string; path: string | null };
  createdAtUtc: string;
  readAtUtc: string | null;
}
