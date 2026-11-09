/**
 * Site languages and the URL scheme that carries them.
 *
 * English is the source language and keeps today's unprefixed URLs: they are
 * canonical, they are `x-default`, and every link the master e-mails, the
 * GitHub OAuth callback, the launcher and Discord already point at them.
 * Every other language lives under its own prefix (`/fr/download`).
 *
 * Only the pages listed in {@link LOCALIZED_ROUTES} exist in other languages.
 * Docs, devblog, workshop, dev tracker, admin and the machine-readable
 * surfaces are English-only: a localized page links to their English URL.
 *
 * This module is imported by the proxy, server components and client
 * components alike, so it holds plain data and pure functions only.
 */

import { parseLocaleTag } from "@/lib/locale";

export const LOCALES = ["en", "fr", "es", "pt-BR", "de", "pl", "ru", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** The languages that carry a URL prefix (every one but English). */
export const PREFIXED_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE) as Exclude<Locale, "en">[];

/** Remembers an explicit choice made in the language selector, English included. */
export const LANGUAGE_COOKIE = "op77_lang";
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Set by the proxy on requests under a language prefix that match no page
 * (`/fr/nope`), so the global 404 answers in that language. Only ever read
 * as one of the supported prefixes; anything else means English.
 */
export const NOT_FOUND_LOCALE_HEADER = "x-open77-locale";

type LocaleInfo = {
  /** URL prefix segment, lowercase (`pt-br`). Empty for English. */
  segment: string;
  /** BCP-47 tag for `<html lang>`, hreflang and `Intl`. */
  tag: string;
  /** `og:locale`. */
  og: string;
  /** The language's own name, for the selector. */
  name: string;
  /** Short label for compact selectors. */
  short: string;
};

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { segment: "", tag: "en", og: "en_US", name: "English", short: "EN" },
  fr: { segment: "fr", tag: "fr", og: "fr_FR", name: "Français", short: "FR" },
  es: { segment: "es", tag: "es", og: "es_ES", name: "Español", short: "ES" },
  "pt-BR": { segment: "pt-br", tag: "pt-BR", og: "pt_BR", name: "Português (Brasil)", short: "PT" },
  de: { segment: "de", tag: "de", og: "de_DE", name: "Deutsch", short: "DE" },
  pl: { segment: "pl", tag: "pl", og: "pl_PL", name: "Polski", short: "PL" },
  ru: { segment: "ru", tag: "ru", og: "ru_RU", name: "Русский", short: "RU" },
  tr: { segment: "tr", tag: "tr", og: "tr_TR", name: "Türkçe", short: "TR" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** `"pt-br"` → `"pt-BR"`; null for anything that is not a prefixed language. */
export function localeFromSegment(segment: string | null | undefined): Exclude<Locale, "en"> | null {
  if (!segment) return null;
  const lower = segment.toLowerCase();
  return PREFIXED_LOCALES.find((locale) => LOCALE_INFO[locale].segment === lower) ?? null;
}

/**
 * Pages that exist in every language, as English paths. A trailing `/*` also
 * matches one dynamic segment under it (`/servers/night-city-rp`).
 */
export const LOCALIZED_ROUTES = [
  "/",
  "/download",
  "/servers",
  "/servers/*",
  "/create",
  "/host",
  "/ncwe",
  "/status",
  "/account",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/launcher",
] as const;

/** True when an English path (no prefix, no query) has versions in other languages. */
export function isLocalizedPath(path: string): boolean {
  const clean = normalizePath(path);
  return LOCALIZED_ROUTES.some((route) =>
    route.endsWith("/*") ? new RegExp(`^${route.slice(0, -2)}/[^/]+$`).test(clean) : clean === route,
  );
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Splits a URL path into its language and the English path underneath:
 * `/pt-br/servers` → `{ locale: "pt-BR", path: "/servers" }`, `/docs` →
 * `{ locale: "en", path: "/docs" }`.
 */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const match = /^\/([^/?#]+)(.*)$/.exec(pathname || "/");
  const locale = localeFromSegment(match?.[1]);
  if (!locale || !match) return { locale: DEFAULT_LOCALE, path: pathname || "/" };
  const rest = match[2] ?? "";
  return { locale, path: rest === "" || rest.startsWith("?") || rest.startsWith("#") ? `/${rest}` : rest };
}

/**
 * The URL of an English path in a language. Paths without a localized version
 * (docs, devblog, anything external) are returned unchanged: their English URL
 * is the only one. Query strings and fragments are kept.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  const [, path = "/", suffix = ""] = /^([^?#]*)(.*)$/.exec(href) ?? [];
  if (splitLocalePath(path).locale !== DEFAULT_LOCALE) return href;
  if (!isLocalizedPath(path)) return href;
  const segment = LOCALE_INFO[locale].segment;
  return `/${segment}${path === "/" ? "" : path}${suffix}`;
}

/**
 * Picks the best supported language for an `Accept-Language` header, or null
 * when nothing in it is supported. Region subtags only matter for Portuguese:
 * any `pt` maps to the Brazilian translation, the only Portuguese one.
 */
export function negotiateLocale(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .slice(0, 20)
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((param) => /^\s*q=([0-9.]+)\s*$/.exec(param)?.[1]).find(Boolean);
      return { tag: tag.trim(), q: q === undefined ? 1 : Number(q), index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const { language } = parseLocaleTag(tag);
    if (!language) continue;
    if (language === "pt") return "pt-BR";
    const match = LOCALES.find((locale) => locale === language);
    if (match) return match;
  }
  return null;
}
