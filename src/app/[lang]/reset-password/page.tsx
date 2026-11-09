import { routeLocale } from "@/i18n/route";
import { authMetadata, ResetPasswordView } from "@/views/auth";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return authMetadata("reset", await routeLocale(params));
}

export default async function LocalizedResetPasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  return <ResetPasswordView locale={await routeLocale(params)} />;
}
