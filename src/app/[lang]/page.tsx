import { routeLocale } from "@/i18n/route";
import { HomeView, homeMetadata } from "@/views/home";

/** Only the seven generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return homeMetadata(await routeLocale(params));
}

export default async function LocalizedHomePage({ params }: { params: Promise<{ lang: string }> }) {
  return <HomeView locale={await routeLocale(params)} />;
}
