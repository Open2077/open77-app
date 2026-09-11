"use client";

import { useSyncExternalStore } from "react";

import { parseLocaleTag } from "@/lib/locale";
import { localeToLang, localeToRegion, type ServerLanguage, type ServerRegion } from "@/lib/servers";

/**
 * Where the player probably is, read from the browser's language preferences.
 *
 * The directory reports no latency, so "close to you" is approximated by
 * locale: the same country first, then the same language, then the same
 * region bucket. `navigator.languages` is the only signal the site has without
 * asking permission or calling a geolocation service, and it is the one
 * roleplay players care about most anyway — the language they play in.
 */
export type PlayerLocale = {
  /** ISO region subtag of the first preferred language that carries one, e.g. `"FR"`. */
  country: string | null;
  /** The directory's language bucket for the first preferred language, when it has one. */
  lang: ServerLanguage | null;
  /** The directory's region bucket for {@link country}. */
  region: ServerRegion | null;
};

const KNOWN_PRIMARY = new Set(["en", "fr", "de", "es"]);

export function detectPlayerLocale(tags: readonly string[]): PlayerLocale {
  let country: string | null = null;
  let lang: ServerLanguage | null = null;
  for (const tag of tags) {
    const parsed = parseLocaleTag(tag);
    if (lang === null && parsed.language && KNOWN_PRIMARY.has(parsed.language)) {
      lang = localeToLang(tag);
    }
    if (country === null && parsed.region && /^[A-Z]{2}$/.test(parsed.region)) {
      country = parsed.region;
    }
    if (lang !== null && country !== null) break;
  }
  return {
    country,
    lang,
    region: country ? localeToRegion(`und-${country}`) : null,
  };
}

const NONE: PlayerLocale = { country: null, lang: null, region: null };
let cached: PlayerLocale | null = null;
const subscribe = (listener: () => void) => {
  window.addEventListener("languagechange", listener);
  return () => window.removeEventListener("languagechange", listener);
};
function snapshot(): PlayerLocale {
  if (cached === null) {
    cached = detectPlayerLocale(
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
  }
  return cached;
}

/** The player's locale, unknown during prerendering and hydration. */
export function usePlayerLocale(): PlayerLocale {
  return useSyncExternalStore(subscribe, snapshot, () => NONE);
}
