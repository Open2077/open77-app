import { routeLocale } from "@/i18n/route";
import { authMetadata, AccountView } from "@/views/auth";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return authMetadata("account", await routeLocale(params));
}

export default async function LocalizedAccountPage({ params }: { params: Promise<{ lang: string }> }) {
  return <AccountView locale={await routeLocale(params)} />;
}
