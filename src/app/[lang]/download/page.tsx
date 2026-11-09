import { routeLocale } from "@/i18n/route";
import { DownloadView, downloadMetadata } from "@/views/download";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return downloadMetadata(await routeLocale(params));
}

export default async function LocalizedDownloadPage({ params }: { params: Promise<{ lang: string }> }) {
  return <DownloadView locale={await routeLocale(params)} />;
}
