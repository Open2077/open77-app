import { routeLocale } from "@/i18n/route";
import { authMetadata, VerifyEmailView } from "@/views/auth";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return authMetadata("verify", await routeLocale(params));
}

export default async function LocalizedVerifyEmailPage({ params }: { params: Promise<{ lang: string }> }) {
  return <VerifyEmailView locale={await routeLocale(params)} />;
}
