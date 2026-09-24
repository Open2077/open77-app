import { masterCall } from "@/lib/account/api";

export type GitHubRepository = { repositoryId: number; ownerId: number; ownerType: string; fullName: string; url: string };
export type GitHubRelease = { releaseId: number; tag: string; name: string; prerelease: boolean; commitSha: string | null };
export type GitHubAsset = { assetId: number; name: string; sizeBytes: number; sha256: string | null; updatedAtUtc: string };
export type GitHubPage<T> = { items: T[]; nextPage: number | null };
export type GitHubSelection = { repository: GitHubRepository; release: GitHubRelease; asset: GitHubAsset; sourceUrl: string };
export type GitHubImport = { importId: string; projectId: string; releaseId: string; uploadId: string; selection: GitHubSelection;
  state: string; errorCode: string | null; createdAtUtc: string; fetchedAtUtc: string | null; sha256: string | null; controlVerifiedAtUtc?: string | null };
export type GitHubConnection = { revision: number; userId: number | null; login: string | null; linkedAtUtc: string | null };
export type GitHubConnectionState = { connection: GitHubConnection; oauthAvailable: boolean; controlVerifiedAtUtc: string | null };
export type GitHubCallbackResult = { connection: GitHubConnection; repositoryId: number | null; repositoryControlVerified: boolean; returnPath: string };
const root = "/api/v1/community";
const project = (id: string) => `${root}/github/projects/${encodeURIComponent(id)}`;
const query = (owner: string, repository: string, extra: Record<string, string> = {}) => new URLSearchParams({ owner, repository, ...extra });
export const capabilities = (signal?: AbortSignal) => masterCall<{ features?: { githubImports?: boolean } }>(`${root}/catalog`, { signal });
export const repository = (token: string, id: string, owner: string, repo: string, signal?: AbortSignal) =>
  masterCall<GitHubRepository>(`${project(id)}/repository?${query(owner, repo)}`, { token, signal });
export const releases = (token: string, id: string, owner: string, repo: string, page: number, signal?: AbortSignal) =>
  masterCall<GitHubPage<GitHubRelease>>(`${project(id)}/releases?${query(owner, repo, { page: String(page) })}`, { token, signal });
export const assets = (token: string, id: string, owner: string, repo: string, releaseId: number, page: number, signal?: AbortSignal) =>
  masterCall<GitHubPage<GitHubAsset>>(`${project(id)}/releases/${releaseId}/assets?${query(owner, repo, { page: String(page) })}`, { token, signal });
export const selection = (token: string, id: string, owner: string, repo: string, releaseId: number, assetId: number, signal?: AbortSignal) =>
  masterCall<GitHubSelection>(`${project(id)}/selection?${query(owner, repo, { releaseId: String(releaseId), assetId: String(assetId) })}`, { token, signal });
export const submit = (token: string, projectId: string, releaseId: string, requestId: string, selection: GitHubSelection, signal?: AbortSignal) =>
  masterCall<GitHubImport>(`${root}/github/imports`, { token, method: "POST", body: { projectId, releaseId, requestId, selection, distributionRightsConfirmed: true }, signal });
export const status = (token: string, id: string, signal?: AbortSignal) => masterCall<GitHubImport>(`${root}/github/imports/${encodeURIComponent(id)}`, { token, signal });
export const connection = (token: string, repositoryId?: number, signal?: AbortSignal) => masterCall<GitHubConnectionState>(`${root}/github/connection${repositoryId ? `?repositoryId=${repositoryId}` : ""}`, { token, signal });
export const connect = (token: string, expectedRevision: number, challenge: string, projectId?: string, repository?: GitHubRepository, signal?: AbortSignal) =>
  masterCall<{ state: string; expiresAtUtc: string; authorizationUrl: string }>(`${root}/github/connect`, { token, method: "POST", body: {
    expectedRevision, challenge, projectId: projectId ?? null, owner: repository?.fullName.split("/")[0] ?? null, repository: repository?.fullName.split("/")[1] ?? null,
  }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
export const disconnect = (token: string, expectedRevision: number) => masterCall<void>(`${root}/github/connection?expectedRevision=${expectedRevision}`, { token, method: "DELETE", signal: AbortSignal.timeout(10000) });
export const finishConnection = (token: string, state: string, code: string, verifier: string) => masterCall<GitHubCallbackResult>(`${root}/github/callback`, { token, method: "POST", body: { state, code, verifier }, signal: AbortSignal.timeout(60000) });
