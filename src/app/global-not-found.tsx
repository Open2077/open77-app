import { headers } from "next/headers";

import "@/styles/system.css";

import { SiteDocument } from "@/components/site/site-document";
import { NOT_FOUND_LOCALE_HEADER, localeFromSegment, type Locale } from "@/i18n/config";
import { NotFoundView, notFoundMetadata } from "@/views/not-found";

/**
 * The 404 for URLs that match no route at all. The site has two root layouts
 * (`(en)` and `[lang]`), so there is no single layout to compose this page
 * from; it renders the whole document itself. Under a language prefix
 * (`/fr/nope`) the proxy names the language in a request header and the page
 * answers in it; everywhere else it is English. Reading that header renders
 * this page per request, which only misses pay for.
 */
async function missLocale(): Promise<Locale> {
  return localeFromSegment((await headers()).get(NOT_FOUND_LOCALE_HEADER)) ?? "en";
}

export async function generateMetadata() {
  return notFoundMetadata(await missLocale());
}

export default async function GlobalNotFound() {
  const locale = await missLocale();
  return (
    <SiteDocument locale={locale}>
      <NotFoundView locale={locale} />
    </SiteDocument>
  );
}
