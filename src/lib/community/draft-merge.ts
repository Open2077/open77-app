import type { CommunityContent } from "./types";

export const draftFields = ["title", "summary", "category", "description", "installation", "kind", "maturity", "tags", "sourceUrl", "issueUrl", "license", "media", "videoUrls"] as const satisfies readonly (keyof CommunityContent)[];
export type DraftField = typeof draftFields[number];
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Collections remain indivisible: combining media order or dependency-like tags
// automatically could create a result neither contributor intended.
export function mergeDraft(base: CommunityContent, local: CommunityContent, remote: CommunityContent) {
  const merged = { ...remote };
  const conflicts: DraftField[] = [];
  for (const field of draftFields) {
    if (same(local[field], base[field])) continue;
    if (!same(remote[field], base[field]) && !same(local[field], remote[field])) conflicts.push(field);
    Object.assign(merged, { [field]: local[field] });
  }
  return { merged, conflicts };
}
