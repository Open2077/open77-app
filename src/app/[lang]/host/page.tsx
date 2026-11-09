import { routeLocale } from "@/i18n/route";
import { HostView, hostMetadata } from "@/views/host";

/** Only the seven generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return hostMetadata(await routeLocale(params));
}

export default async function LocalizedHostPage({ params }: { params: Promise<{ lang: string }> }) {
  return <HostView locale={await routeLocale(params)} />;
}
