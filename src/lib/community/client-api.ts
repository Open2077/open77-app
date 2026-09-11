import { masterCall } from "@/lib/account/api";
import type { CommunityContent, CommunityDelivery, CommunityPage, CommunityProject } from "./types";
const root = "/api/v1/community";
export const myProjects = (token: string, signal?: AbortSignal) => masterCall<CommunityPage<CommunityProject>>(`${root}/me/projects`, { token, signal });
export const myProject = (token: string, id: string, signal?: AbortSignal) => masterCall<CommunityProject>(`${root}/me/projects/${encodeURIComponent(id)}`, { token, signal });
export const createProject = (token: string, slug: string, content: CommunityContent) => masterCall<CommunityProject>(`${root}/projects`, { token, method: "POST", body: { slug, content } });
export const editProject = (token: string, id: string, expectedRevision: number, content: CommunityContent) => masterCall<CommunityProject>(`${root}/projects/${encodeURIComponent(id)}`, { token, method: "PATCH", body: { expectedRevision, content } });
export const submitProject = (token: string, id: string, expectedRevision: number) => masterCall<void>(`${root}/projects/${encodeURIComponent(id)}/submit`, { token, method: "POST", body: { expectedRevision } });
export const requestDownload = (releaseId: string) => masterCall<CommunityDelivery>(`${root}/releases/${encodeURIComponent(releaseId)}/download`, { method: "POST", signal: AbortSignal.timeout(10000) });
