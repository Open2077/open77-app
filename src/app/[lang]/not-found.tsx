import { lang } from "next/root-params";

import { localeFromSegment } from "@/i18n/config";
import { NotFoundView, notFoundMetadata } from "@/views/not-found";

export async function generateMetadata() {
  return notFoundMetadata(localeFromSegment(await lang()) ?? "en");
}

/** The 404 of a translated page, in its language (`notFound()` and unknown paths under a prefix). */
export default async function NotFound() {
  return <NotFoundView locale={localeFromSegment(await lang()) ?? "en"} />;
}
