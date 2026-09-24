import "server-only";
import { cache } from "react";
import { MASTER_URL } from "@/lib/account/api";
import type { CommunityComment, CommunityCreatorPage, CommunityMedia, CommunityPage, CommunityProject, CommunityRelease } from "./types";
import type { CommunityDirectoryPage, CommunityDirectoryQuery, CommunitySitemapEntry, CommunitySitemapShard } from "./types";
import { directoryQuery } from "./directory";

const origin = (process.env.OP77_COMMUNITY_API_URL ?? MASTER_URL).replace(/\/$/, "");
export class CommunityReadError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${origin}/api/v1/community${path}`, {
      cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { Accept: "application/json" },
    });
  } catch { throw new CommunityReadError(503, "The hub is temporarily unavailable. Please try again shortly."); }
  if (!response.ok) throw new CommunityReadError(response.status, "The resource hub could not load this content.");
  try { return await response.json() as T; }
  catch { throw new CommunityReadError(502, "The hub returned an unreadable response."); }
}
export function listProjects(params: CommunityDirectoryQuery = {}) {
  return read<CommunityDirectoryPage>(`/projects?${directoryQuery({ ...params, limit: params.limit ?? 24 })}`);
}
export const sitemapShards = (signal?: AbortSignal) => read<CommunitySitemapShard[]>("/sitemap", signal);
export const sitemapEntries = (kind: string, bucket: string, cursor?: string, signal?: AbortSignal) => read<CommunityPage<CommunitySitemapEntry>>(`/sitemap/${encodeURIComponent(kind)}/${encodeURIComponent(bucket)}?limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, signal);
// Request memoization only: page and metadata share an approved snapshot.
export const getProject = cache((slug: string) => read<CommunityProject>(`/projects/${encodeURIComponent(slug)}`));
export const getMedia = cache((id: string) => read<CommunityMedia>(`/media/${encodeURIComponent(id)}`));
export const getComment = cache((id: string) => read<CommunityComment>(`/comments/${encodeURIComponent(id)}`));
export const latestRelease = (projectId: string) => read<CommunityRelease | null>(`/projects/${encodeURIComponent(projectId)}/releases/latest`);
export const getComments = (id: string, cursor?: string) => read<CommunityPage<CommunityComment>>(`/projects/${encodeURIComponent(id)}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
export const getCreator = cache((handle: string, cursor?: string) => read<CommunityCreatorPage>(`/creators/${encodeURIComponent(handle)}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`));
export function listReleases(projectId: string, cursor?: string) {
  const query = new URLSearchParams({ limit: "24" });
  if (cursor) query.set("cursor", cursor);
  return read<CommunityPage<CommunityRelease>>(`/projects/${encodeURIComponent(projectId)}/releases?${query}`);
}
