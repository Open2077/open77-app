import { routeLocale } from "@/i18n/route";
import { NcweView, ncweMetadata } from "@/views/ncwe";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return ncweMetadata(await routeLocale(params));
}

export default async function LocalizedNcwePage({ params }: { params: Promise<{ lang: string }> }) {
  return <NcweView locale={await routeLocale(params)} />;
}
