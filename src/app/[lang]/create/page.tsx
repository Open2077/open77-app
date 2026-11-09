import { routeLocale } from "@/i18n/route";
import { CreateView, createMetadata } from "@/views/create";

/** Only the seven generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return createMetadata(await routeLocale(params));
}

export default async function LocalizedCreatePage({ params }: { params: Promise<{ lang: string }> }) {
  return <CreateView locale={await routeLocale(params)} />;
}
