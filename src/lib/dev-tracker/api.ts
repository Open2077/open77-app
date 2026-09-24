import { masterCall } from "@/lib/account/api";
import type { Catalog, Comment, Detail, Idea, Page, Quota } from "./types";
const root = "/api/v1/dev-tracker";
export const catalog = (signal?: AbortSignal) => masterCall<Catalog>(`${root}/catalog`, { signal });
export function ideas(filters: Record<string, string | number | undefined>, token?: string, signal?: AbortSignal) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") query.set(key, String(value));
  return masterCall<Page<Idea>>(`${root}/ideas?${query}`, { token, signal });
}
export const detail = (id: string, token?: string, signal?: AbortSignal) => masterCall<Detail>(`${root}/ideas/${encodeURIComponent(id)}`, { token, signal });
export const comments = (id: string, page: number, token?: string, signal?: AbortSignal) => masterCall<Page<Comment>>(`${root}/ideas/${encodeURIComponent(id)}/comments?page=${page}`, { token, signal });
export const quota = (token: string, signal?: AbortSignal) => masterCall<Quota>(`${root}/me/quota`, { token, signal });
export const create = (token: string, body: { requestId: string; title: string; body: string; category: string }) => masterCall<Idea>(`${root}/ideas`, { token, method: "POST", body, signal: AbortSignal.timeout(15000) });
export const vote = (token: string, id: string, value: number) => masterCall<Idea>(`${root}/ideas/${encodeURIComponent(id)}/vote`, { token, method: "PUT", body: { value }, signal: AbortSignal.timeout(12000) });
export const edit = (token: string, idea: Idea, body: { title: string; body: string; category: string; withdraw?: boolean }) => masterCall<Idea>(`${root}/ideas/${encodeURIComponent(idea.id)}`, { token, method: "PATCH", body: { ...body, expectedRevision: idea.revision }, signal: AbortSignal.timeout(12000) });
export const review = (token: string, idea: Idea, body: { state: string; hidden: boolean; locked: boolean; message: string }) => masterCall<Idea>(`${root}/ideas/${encodeURIComponent(idea.id)}/review`, { token, method: "POST", body: { ...body, expectedRevision: idea.revision }, signal: AbortSignal.timeout(12000) });
export const postComment = (token: string, id: string, body: { requestId: string; parentId: string | null; body: string }) => masterCall<Comment>(`${root}/ideas/${encodeURIComponent(id)}/comments`, { token, method: "POST", body, signal: AbortSignal.timeout(15000) });
export const changeComment = (token: string, comment: Comment, body: { action: string; body?: string; reason?: string }) => masterCall<Comment>(`${root}/ideas/${encodeURIComponent(comment.ideaId)}/comments/${encodeURIComponent(comment.id)}`, { token, method: "PATCH", body: { ...body, expectedRevision: comment.revision }, signal: AbortSignal.timeout(12000) });
