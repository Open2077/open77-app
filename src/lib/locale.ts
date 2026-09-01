/**
 * BCP-47 locale tags, as they reach the site from server operators.
 *
 * A listing's `locale` is typed by whoever runs the server. The master
 * validates it, but this module treats it as untrusted anyway: every value that
 * leaves here is either `null` or matches a shape checked by a regular
 * expression, so nothing downstream ever renders, keys, or looks up a raw
 * operator string.
 *
 * Parsing is deliberately structural rather than exhaustive — it recognises the
 * language, script and region positions of a tag without carrying the IANA
 * registry, which is all the browser needs to show a flag and offer a filter.
 */

/**
 * Longest tag considered. Real tags are far shorter; the cap keeps a pathological
 * value from being split into thousands of subtags before it is rejected.
 */
const MAX_TAG_LENGTH = 40;

export type ParsedLocale = {
  /** Lowercase primary language subtag — `"fr"` for `fr-FR` — or null. */
  language: string | null;
  /**
   * Region subtag, normalised: an uppercase ISO 3166-1 alpha-2 code (`"FR"`) or
   * a UN M.49 numeric code (`"419"`). Null when the operator gave a bare
   * language such as `en`, or when the tag is unusable.
   */
  region: string | null;
};

const UNKNOWN: ParsedLocale = { language: null, region: null };

/**
 * Codes people type that are not the ISO 3166-1 alpha-2 for that place. `UK`
 * and `EL` are common enough in hand-written config to be worth accepting.
 */
const REGION_ALIASES: Readonly<Record<string, string>> = { UK: "GB", EL: "GR" };

/**
 * Splits a BCP-47 tag into the two subtags the browser cares about.
 *
 * The scan skips a script subtag (`zh-Hans-CN` → `CN`) and stops at the first
 * subtag it does not recognise, so a variant or extension can never be mistaken
 * for a region. Anything malformed comes back as {@link UNKNOWN} rather than a
 * partial guess.
 */
export function parseLocaleTag(locale: string | null | undefined): ParsedLocale {
  if (typeof locale !== "string") return UNKNOWN;
  const trimmed = locale.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TAG_LENGTH) return UNKNOWN;

  const parts = trimmed.split(/[-_]/);
  const primary = parts[0] ?? "";
  if (!/^[A-Za-z]{2,3}$/.test(primary)) return UNKNOWN;

  let region: string | null = null;
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{4}$/.test(part)) continue; // script subtag — keep looking
    if (/^[A-Za-z]{2}$/.test(part)) {
      const code = part.toUpperCase();
      region = REGION_ALIASES[code] ?? code;
    } else if (/^[0-9]{3}$/.test(part)) {
      region = part;
    }
    break;
  }

  return { language: primary.toLowerCase(), region };
}

/** True for a two-letter country code — the only shape that can have a flag. */
export function isCountryCode(region: string | null | undefined): region is string {
  return typeof region === "string" && /^[A-Z]{2}$/.test(region);
}

/**
 * A value narrowed to a region code the site will show: an ISO 3166-1 alpha-2
 * country, or a UN M.49 macro-region such as `419`. Null for anything else,
 * including values that never came through {@link parseLocaleTag}.
 */
export function regionCode(value: string | null | undefined): string | null {
  return typeof value === "string" && /^([A-Z]{2}|[0-9]{3})$/.test(value) ? value : null;
}

let regionNames: Intl.DisplayNames | null | undefined;
let languageNames: Intl.DisplayNames | null | undefined;

/**
 * `Intl.DisplayNames` is asked for English names rather than the visitor's
 * locale: the site is English, and a stable answer keeps prerendered markup and
 * hydrated markup identical. A runtime without the data simply yields null and
 * every caller falls back to the code itself.
 */
function displayNames(type: "region" | "language"): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(["en"], { type });
  } catch {
    return null;
  }
}

const regionNameCache = new Map<string, string>();

/** "FR" → "France". Returns the code unchanged when it cannot be named. */
export function regionDisplayName(region: string): string {
  const cached = regionNameCache.get(region);
  if (cached !== undefined) return cached;

  if (regionNames === undefined) regionNames = displayNames("region");
  let name = region;
  try {
    name = regionNames?.of(region) ?? region;
  } catch {
    name = region;
  }
  regionNameCache.set(region, name);
  return name;
}

const languageNameCache = new Map<string, string>();

/** "fr" → "French". Returns the subtag unchanged when it cannot be named. */
export function languageDisplayName(language: string): string {
  const cached = languageNameCache.get(language);
  if (cached !== undefined) return cached;

  if (languageNames === undefined) languageNames = displayNames("language");
  let name = language;
  try {
    name = languageNames?.of(language) ?? language;
  } catch {
    name = language;
  }
  languageNameCache.set(language, name);
  return name;
}

/**
 * The raw tag, made safe to show: trimmed, length-capped, and reduced to the
 * characters a tag may contain. Returns "—" when nothing usable is left, which
 * is the same "unknown" mark the rest of the browser uses.
 */
export function formatLocaleTag(locale: string | null | undefined): string {
  if (typeof locale !== "string") return "—";
  const cleaned = locale.trim().slice(0, MAX_TAG_LENGTH).replace(/[^A-Za-z0-9_-]/g, "");
  return cleaned.length > 0 ? cleaned : "—";
}
