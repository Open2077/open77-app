import type { Metadata } from "next";

import { routeLocale } from "@/i18n/route";
import { ServerProfileView, serverProfileMetadata } from "@/views/server-profile";

// Same ISR contract as the English profile: generated on first visit, refreshed
// every five minutes, never fanned out per server at build time.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [locale, { id }] = await Promise.all([routeLocale(params), params]);
  return serverProfileMetadata(locale, id);
}

export default async function LocalizedServerPage({ params }: { params: Params }) {
  const [locale, { id }] = await Promise.all([routeLocale(params), params]);
  return <ServerProfileView locale={locale} id={id} />;
}
