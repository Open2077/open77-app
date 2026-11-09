import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE,
  LOCALE_INFO,
  NOT_FOUND_LOCALE_HEADER,
  isLocale,
  isLocalizedPath,
  localizeHref,
  negotiateLocale,
  splitLocalePath,
  type Locale,
} from "@/i18n/config";

/**
 * Language redirect, and nothing else.
 *
 * Pages stay static: no page reads cookies or headers while rendering. The
 * one decision that needs the request — which language to show — is taken
 * here, before the cached page is served, and only on the pages that exist in
 * several languages (see the matcher).
 *
 * 1. A language chosen in the selector (`op77_lang`, English included) always
 *    wins, on prefixed and unprefixed URLs alike.
 * 2. Otherwise, on an English (unprefixed) URL only, the browser's
 *    Accept-Language picks a supported language. A visitor following a link to
 *    `/fr/…` gets French.
 * 3. No cookie and no Accept-Language — crawlers, link previews, scripts — is
 *    never redirected, and known crawlers are skipped even when they send one,
 *    so every language's URL stays indexable as itself. No IP geolocation.
 *
 * A path under a language prefix that is no page at all (`/fr/nope`) is passed
 * on untouched, with a request header telling the global 404 its language.
 */
const CRAWLER = /bot|crawler|spider|slurp|facebookexternalhit|embedly|whatsapp|telegram|vkshare|lighthouse|pagespeed/i;

export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const { pathname } = request.nextUrl;
  const { locale: current, path } = splitLocalePath(pathname);
  if (!isLocalizedPath(path)) {
    const headers = new Headers(request.headers);
    headers.delete(NOT_FOUND_LOCALE_HEADER);
    if (current !== DEFAULT_LOCALE) headers.set(NOT_FOUND_LOCALE_HEADER, LOCALE_INFO[current].segment);
    return NextResponse.next({ request: { headers } });
  }

  const chosen = request.cookies.get(LANGUAGE_COOKIE)?.value;
  let target: Locale | null = null;
  if (isLocale(chosen)) {
    target = chosen;
  } else if (current === DEFAULT_LOCALE && !CRAWLER.test(request.headers.get("user-agent") ?? "")) {
    target = negotiateLocale(request.headers.get("accept-language"));
  }
  if (!target || target === current) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = localizeHref(path, target);
  const response = NextResponse.redirect(url, 307);
  // The answer depends on this visitor's cookie and language: never cache it.
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

/**
 * The translated pages without a prefix, and everything under a language
 * prefix (translated pages, and the misses that get a translated 404; the
 * English-only sections under a prefix are redirected by next.config before
 * the proxy runs). English-only pages, assets, API routes and `_next` never
 * reach the proxy. Keep in sync with `LOCALIZED_ROUTES`.
 */
export const config = {
  matcher: [
    "/",
    "/:page(download|servers|create|host|ncwe|status|account|verify-email|forgot-password|reset-password|launcher)",
    "/servers/:id",
    "/:lang(fr|es|pt-br|de|pl|ru|tr|ja|th)",
    "/:lang(fr|es|pt-br|de|pl|ru|tr|ja|th)/:path+",
  ],
};
