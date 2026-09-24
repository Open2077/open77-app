const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugShape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

// The master may normalize the requested slug; its response slug is authoritative as long as it is well formed.
export function validCreatedProject(value: unknown, slug: string): boolean {
  if (!object(value) || typeof value.projectId !== "string" || !guid.test(value.projectId) || typeof value.slug !== "string" || !slugShape.test(value.slug) || !slug ||
      !Number.isSafeInteger(value.revision) || (value.revision as number) < 1 || !object(value.content)) return false;
  return ["title", "summary", "category", "description", "installation", "kind", "maturity"].every(key => typeof value.content === "object" && typeof (value.content as Record<string, unknown>)[key] === "string") && Array.isArray(value.content.tags);
}

export function validCreatedRelease(value: unknown, projectId: string, version: string): boolean {
  return object(value) && typeof value.releaseId === "string" && guid.test(value.releaseId) && value.projectId === projectId &&
    value.version === version && typeof value.state === "string" && ["stable", "prerelease"].includes(value.channel as string);
}
