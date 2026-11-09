import { routeLocale } from "@/i18n/route";
import { ServersView, serversMetadata } from "@/views/servers";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return serversMetadata(await routeLocale(params));
}

export default async function LocalizedServersPage({ params }: { params: Promise<{ lang: string }> }) {
  return <ServersView locale={await routeLocale(params)} />;
}
