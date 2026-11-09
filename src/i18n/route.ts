import { notFound } from "next/navigation";

import { LOCALE_INFO, PREFIXED_LOCALES, localeFromSegment, type Locale } from "./config";

/** Static params for the `[lang]` tree: one per prefixed language (`fr`, `pt-br`…). */
export function languageParams(): { lang: string }[] {
  return PREFIXED_LOCALES.map((locale) => ({ lang: LOCALE_INFO[locale].segment }));
}

/**
 * The language of the `[lang]` root layout. Never a 404: a `notFound()` thrown
 * by a root layout has no boundary above it and ends on Next's bare error page.
 * The `[lang]` routes that render on demand (download, host, server profiles)
 * also receive English misses such as `/docs/download`, after the English
 * route declined them; the layout renders those in English and the page's own
 * {@link routeLocale} turns them into the site's 404.
 */
export async function layoutLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  const locale = localeFromSegment(lang);
  return locale && LOCALE_INFO[locale].segment === lang ? locale : "en";
}

/** The language of a `[lang]` page; unknown prefixes (and other spellings, `/PT-BR`) are a 404. */
export async function routeLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  const locale = localeFromSegment(lang);
  if (!locale || LOCALE_INFO[locale].segment !== lang) notFound();
  return locale;
}
