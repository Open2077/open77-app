import { routeLocale } from "@/i18n/route";
import { authMetadata, LauncherView } from "@/views/auth";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return authMetadata("launcher", await routeLocale(params));
}

export default async function LocalizedLauncherPage({ params }: { params: Promise<{ lang: string }> }) {
  return <LauncherView locale={await routeLocale(params)} />;
}
