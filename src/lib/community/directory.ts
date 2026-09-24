import type { CommunityDirectoryQuery } from "./types";

export const directorySorts = [
  { id: "new", label: "Newest creations" }, { id: "trending", label: "Trending this week" },
  { id: "updated", label: "Recently updated" }, { id: "upvotes", label: "Most upvoted" },
  { id: "downloads", label: "Most downloaded" }, { id: "featured", label: "Editorial picks" },
] as const;

export function directoryQuery(params: CommunityDirectoryQuery) {
  const query = new URLSearchParams();
  for (const key of ["query", "category", "tags", "kind", "build", "hasSource", "sort", "cursor"] as const)
    if (params[key]) query.set(key, params[key]);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  return query;
}
