import { routeLocale } from "@/i18n/route";
import { StatusView, statusMetadata } from "@/views/status";

/** Only the seven generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return statusMetadata(await routeLocale(params));
}

export default async function LocalizedStatusPage({ params }: { params: Promise<{ lang: string }> }) {
  return <StatusView locale={await routeLocale(params)} />;
}
