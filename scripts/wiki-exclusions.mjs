/** Public guide ownership and wiki import exclusions. See docs/documentation-style.md. */
import { readFileSync } from "node:fs";

export const EXCLUDED_GUIDES = new Map();
export const EXCLUDED_TOOLING = new Set(["tools/README.md"]);

const curatedGuides = JSON.parse(readFileSync(new URL("./curated-docs.json", import.meta.url), "utf8"));

/** Curated public prose is merged manually when upstream contracts change. */
export const APP_OWNED_GUIDES = new Map(
  curatedGuides.map((file) => [file, "site editorial ownership: preserve reviewed prose"]),
);

export function isAppOwned(filename) {
  return APP_OWNED_GUIDES.has(filename);
}

export function isExcluded(filename) {
  return EXCLUDED_GUIDES.has(filename) || EXCLUDED_TOOLING.has(filename);
}
