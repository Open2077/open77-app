/** Public resource addresses: lowercase words joined by single hyphens. */
export function normalizeSlug(value: string, { final = false } = {}): string {
  let slug = value.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-+/, "");
  if (final) slug = slug.replace(/-+$/, "");
  return slug.slice(0, 80);
}
