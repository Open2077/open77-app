import { routeLocale } from "@/i18n/route";
import { authMetadata, ForgotPasswordView } from "@/views/auth";

/** Only the generated language prefixes exist; anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return authMetadata("forgot", await routeLocale(params));
}

export default async function LocalizedForgotPasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  return <ForgotPasswordView locale={await routeLocale(params)} />;
}
