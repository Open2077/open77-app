/**
 * Chrome's built-in Translator API (Chrome 138+ on desktop): on-device, free,
 * no request leaves the browser. https://developer.chrome.com/docs/ai/translator-api
 *
 * Typed here rather than through `@types/dom-chromium-ai`: the site uses four
 * members of it, and everything is feature-detected at run time anyway.
 */

import { translatorCandidates } from "./text";

export type TranslatorAvailability = "unavailable" | "downloadable" | "downloading" | "available";

export type TranslatorInstance = {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
};

export type TranslatorApi = {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    signal?: AbortSignal;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<TranslatorInstance>;
};

/** The API, or null in browsers without it (Firefox, Safari, mobile, older Chrome). */
export function translatorApi(): TranslatorApi | null {
  if (typeof self === "undefined" || !("Translator" in self)) return null;
  const api = (self as unknown as { Translator?: TranslatorApi }).Translator;
  return api && typeof api.create === "function" && typeof api.availability === "function" ? api : null;
}

/**
 * - `none`: no API at all;
 * - `unavailable`: the API cannot translate English into this language here;
 * - `downloadable`: it can, after a model download that needs a click
 *   (Chrome also reports this for a model it already has until this site has
 *   created a translator for the pair, so it does not reveal what is installed);
 * - `available`: ready, no click needed.
 */
export type TranslatorSupport = "none" | "unavailable" | "downloadable" | "available";

/** What the browser can do for a visitor's language, and the tag it accepts for it. */
export async function resolveTranslator(target: string): Promise<{ support: TranslatorSupport; tag: string | null }> {
  const api = translatorApi();
  if (!api) return { support: "none", tag: null };
  for (const tag of translatorCandidates(target)) {
    try {
      const availability = await api.availability({ sourceLanguage: "en", targetLanguage: tag });
      if (availability === "available") return { support: "available", tag };
      if (availability === "downloadable" || availability === "downloading") return { support: "downloadable", tag };
    } catch {
      // A tag this browser does not accept: try the next, shorter one.
    }
  }
  return { support: "unavailable", tag: null };
}

/** `downloadprogress` reports a 0–1 fraction (`loaded` out of a `total` of 1). */
export function downloadFraction(event: Event): number {
  const { loaded, total } = event as ProgressEvent;
  if (typeof loaded !== "number" || !Number.isFinite(loaded)) return 0;
  const fraction = total && total > 1 ? loaded / total : loaded;
  return Math.min(1, Math.max(0, fraction));
}
